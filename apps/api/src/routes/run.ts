import type { FastifyBaseLogger, FastifyInstance } from "fastify";
import { cacheKey, readCache, writeCache } from "../cache.js";
import type { AppContext } from "../context.js";
import { engineBaseUrls } from "../engines.js";
import { cacheEvents, runDuration, runsTotal } from "../metrics.js";
import { clampTimeout, normalizeFlags, runRequestSchema, validationMessage } from "../schemas.js";
import { consume, resolveBudget } from "../security.js";
import type { ApiResponse, EngineResponse, NormalizedRunRequest } from "../types.js";
import { joinUrl, parseJson, postJson } from "../upstream.js";

type RunResult = {
  status: number;
  body: ApiResponse | EngineResponse | { ok: false; error: string };
  cache: "positive" | "negative" | "none";
  retryAfter?: string;
};

function mapEngineErrorToStatus(engineStatusCode: number): number {
  if (engineStatusCode === 408) return 504;
  if (engineStatusCode === 400) return 400;
  return 502;
}

function withDroppedFlags(body: RunResult["body"], droppedFlags: string[]): RunResult["body"] {
  if (!droppedFlags.length || !body || !("meta" in body)) return body;
  return { ...body, meta: { ...(body as ApiResponse).meta, droppedFlags } } as RunResult["body"];
}

export function registerRunRoute(app: FastifyInstance, ctx: AppContext): void {
  const { config, redis } = ctx;
  const engineBase = engineBaseUrls(config);

  /**
   * Requests that hash to the same cache key and arrive while one is already
   * running share its result instead of each spawning an engine process.
   */
  const inFlight = new Map<string, Promise<RunResult>>();

  function normalizeRequest(body: unknown): NormalizedRunRequest {
    const parsed = runRequestSchema.parse(body);

    const timeoutMs = clampTimeout(parsed.options?.timeoutMs, {
      min: config.MIN_TIMEOUT_MS,
      max: config.MAX_TIMEOUT_MS,
      fallback: config.DEFAULT_TIMEOUT_MS,
    });

    const { flags, dropped } = normalizeFlags(
      parsed.engine,
      parsed.options?.flags ?? [],
      config.MAX_FLAGS,
    );

    if (parsed.sourceText.length > config.MAX_SOURCE_LENGTH) {
      throw new Error(`sourceText exceeds limit (${config.MAX_SOURCE_LENGTH} chars)`);
    }

    return {
      engine: parsed.engine,
      sourceText: parsed.sourceText,
      flags,
      timeoutMs,
      droppedFlags: dropped,
    };
  }

  async function executeRun(
    normalized: NormalizedRunRequest,
    log: FastifyBaseLogger,
  ): Promise<RunResult> {
    const start = Date.now();
    const engineUrl = joinUrl(engineBase[normalized.engine], "/run");

    const res = await postJson(
      "engine",
      engineUrl,
      {
        sourceText: normalized.sourceText,
        options: { flags: normalized.flags, timeoutMs: normalized.timeoutMs },
      },
      normalized.timeoutMs + 1000,
    );

    if (!res.ok) {
      log.error({ err: res.error, engineUrl, kind: res.kind }, "engine request failed");
      return { status: 502, body: { ok: false, error: res.message }, cache: "none" };
    }

    if (res.status < 200 || res.status >= 300) {
      log.error(
        { engineUrl, status: res.status, sample: res.text.slice(0, 500) },
        "engine returned non-2xx",
      );
    }

    if (res.status === 429) {
      const retryAfter = res.headers["retry-after"];
      return {
        status: 429,
        body: parseJson<EngineResponse>(res.text) ?? { ok: false, error: "engine busy" },
        cache: "none",
        retryAfter: retryAfter ? String(retryAfter) : undefined,
      };
    }

    if (res.status >= 500) {
      return {
        status: 502,
        body: { ok: false, error: `engine unavailable (${res.status})` },
        cache: "none",
      };
    }

    const enginePayload = parseJson<EngineResponse>(res.text);
    if (!enginePayload) {
      log.error(
        { status: res.status, sample: res.text.slice(0, 2000) },
        "engine returned non-json",
      );
      return {
        status: 502,
        body: { ok: false, error: "engine returned invalid response" },
        cache: "none",
      };
    }

    if (!enginePayload.ok) {
      const status = mapEngineErrorToStatus(res.status);
      // A deterministic failure is worth remembering briefly; an infrastructure
      // one is not — it would pin a transient outage into every later request.
      const cache = status === 400 || status === 504 ? "negative" : "none";
      return { status, body: enginePayload, cache };
    }

    return {
      status: 200,
      body: {
        ...enginePayload,
        meta: {
          ...(enginePayload.meta || {}),
          durationMs: Date.now() - start,
          engine: normalized.engine,
          cacheHit: false,
        },
      },
      cache: "positive",
    };
  }

  app.post("/api/run", async (req, reply) => {
    const start = Date.now();

    let normalized: NormalizedRunRequest;
    try {
      normalized = normalizeRequest(req.body);
    } catch (err: unknown) {
      reply.code(400).send({ ok: false, error: validationMessage(err) });
      return;
    }

    const budget = await resolveBudget(ctx, req, reply);
    if (!budget) return; // invalid API key → 401 already sent
    if (await consume(ctx, budget.id, budget.general, req, reply)) return;

    const isDev = process.env.NODE_ENV !== "production";
    const key = cacheKey(normalized);
    const cached = isDev ? null : await readCache(redis, key, req.log);

    if (cached) {
      cacheEvents.inc({ result: "hit" });
      runsTotal.inc({ engine: normalized.engine, outcome: "cache_hit" });
      const body =
        cached.status === 200 && cached.body && "meta" in cached.body
          ? {
              ...(cached.body as ApiResponse),
              meta: {
                ...(cached.body as ApiResponse).meta,
                cacheHit: true,
                durationMs: Date.now() - start,
              },
            }
          : cached.body;
      reply.code(cached.status).send(withDroppedFlags(body, normalized.droppedFlags));
      return;
    }
    if (!isDev) cacheEvents.inc({ result: "miss" });

    // Only a cache miss actually spawns an engine, so the heavy budget is spent
    // here rather than up front with the general one.
    if (await consume(ctx, budget.id, budget.heavy, req, reply)) return;

    let result: RunResult;
    const existing = inFlight.get(key);
    if (existing) {
      result = await existing;
    } else {
      const pending = executeRun(normalized, req.log);
      inFlight.set(key, pending);
      try {
        result = await pending;
      } finally {
        inFlight.delete(key);
      }
      if (!isDev && result.cache !== "none") {
        const ttl =
          result.cache === "positive"
            ? config.CACHE_TTL_SECONDS
            : config.NEGATIVE_CACHE_TTL_SECONDS;
        await writeCache(redis, key, { status: result.status, body: result.body }, ttl, req.log);
      }
    }

    const outcome = result.status === 200 ? "ok" : result.status === 429 ? "engine_busy" : "error";
    runsTotal.inc({ engine: normalized.engine, outcome });
    runDuration.observe({ engine: normalized.engine, outcome }, (Date.now() - start) / 1000);

    if (result.retryAfter) reply.header("retry-after", result.retryAfter);
    reply.code(result.status).send(withDroppedFlags(result.body, normalized.droppedFlags));
  });
}
