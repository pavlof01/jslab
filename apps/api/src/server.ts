import fastify from "fastify";
import underPressure from "@fastify/under-pressure";
import { Redis } from "ioredis";
import { request } from "undici";
import { cacheKey, readCache, writeCache } from "./cache.js";
import { loadConfig } from "./config.js";
import { enforceRateLimit } from "./rateLimit.js";
import { normalizeFlags, runRequestSchema } from "./schemas.js";
import type { ApiResponse, EngineResponse, NormalizedRunRequest } from "./types.js";

const config = loadConfig();

const redis = new Redis(config.REDIS_URL, {
  // Small win: fail faster on network/Redis issues instead of hanging too long.
  maxRetriesPerRequest: 2,
  enableReadyCheck: true,
});

const app = fastify({
  logger: { level: config.LOG_LEVEL },
  bodyLimit: config.REQUEST_BODY_LIMIT_BYTES,

  // IMPORTANT: enable only if you are actually behind a reverse proxy (Traefik/Nginx).
  // With trustProxy=true, Fastify derives req.ip from X-Forwarded-For *only* from trusted proxies,
  // so we don't have to parse XFF manually (and avoid spoofing).
  trustProxy: (addr) => addr === "127.0.0.1" || addr === "::1", // или CIDR твоего ingress
});

function headerOne(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

// Under pressure (it's better to set thresholds explicitly)
app.register(underPressure, {
  maxEventLoopDelay: 1000,
  maxHeapUsedBytes: 1024 * 1024 * 1024, // 1GB (tune for your VM)
  message: "under pressure",
  retryAfter: 10,
});

// API key guard (skip for health checks)
app.addHook("onRequest", async (req, reply) => {
  if (req.url === "/healthz") return;
  if (config.PUBLIC_RUN_ENDPOINT) return;
  if (!config.API_KEY) {
    req.log.error("API_KEY is required but missing");
    return reply.code(500).send({ ok: false, error: "api key not configured" });
  }

  const incoming = headerOne(req.headers["x-api-key"]);
  if (incoming !== config.API_KEY) {
    return reply.code(401).send({ ok: false, error: "invalid api key" });
  }
});

app.get("/healthz", async () => ({ ok: true, redis: redis.status }));

function clientIp(req: any): string {
  // With trustProxy=true, Fastify will compute req.ip correctly behind trusted proxies.
  // Do not parse x-forwarded-for manually to avoid letting clients spoof it.
  return req.ip;
}

function normalizeRequest(body: unknown): NormalizedRunRequest {
  const parsed = runRequestSchema.parse(body);

  const timeoutMs = Math.min(parsed.options?.timeoutMs ?? config.DEFAULT_TIMEOUT_MS, config.MAX_TIMEOUT_MS);

  const flags = normalizeFlags(parsed.engine, parsed.options?.flags ?? [], config.MAX_FLAGS);

  if (parsed.sourceText.length > config.MAX_SOURCE_LENGTH) {
    throw new Error(`sourceText exceeds limit (${config.MAX_SOURCE_LENGTH} chars)`);
  }

  return {
    engine: parsed.engine,
    task: parsed.task,
    sourceText: parsed.sourceText,
    flags,
    timeoutMs,
  };
}

function mapEngineErrorToStatus(enginePayload: any): number {
  // Best-effort mapping when EngineResponse schema is not fully known.
  const msg = String(enginePayload?.error ?? "").toLowerCase();

  if (msg.includes("timeout") || msg.includes("timed out")) return 504;
  if (msg.includes("invalid") || msg.includes("bad request") || msg.includes("parse")) return 400;
  if (msg.includes("rate")) return 429;

  // Some engines might include an explicit statusCode.
  const statusCode = Number(enginePayload?.statusCode);
  if (Number.isFinite(statusCode) && statusCode >= 400 && statusCode <= 599) return statusCode;

  return 502;
}

function classifyEngineError(err: any): { kind: string; message: string } {
  const code = err?.code;
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return { kind: "dns", message: "engine DNS lookup failed" };
  }
  if (code === "ECONNREFUSED") {
    return { kind: "connect_refused", message: "engine connection refused" };
  }
  if (code === "UND_ERR_CONNECT_TIMEOUT" || code === "ETIMEDOUT") {
    return { kind: "connect_timeout", message: "engine connect timeout" };
  }
  if (code === "UND_ERR_HEADERS_TIMEOUT") {
    return { kind: "headers_timeout", message: "engine headers timeout" };
  }
  if (code === "UND_ERR_BODY_TIMEOUT") {
    return { kind: "body_timeout", message: "engine body timeout" };
  }
  return { kind: "request_error", message: "engine request failed" };
}

app.post("/api/run", async (req, reply) => {
  const start = Date.now();

  let normalized: NormalizedRunRequest;
  try {
    normalized = normalizeRequest(req.body);
  } catch (err: any) {
    reply.code(400).send({ ok: false, error: err?.message || "invalid payload" });
    return;
  }

  const ip = clientIp(req);

  const rate = await enforceRateLimit(
    redis,
    ip,
    normalized.task,
    {
      generalLimit: config.RATE_LIMIT_PER_MIN,
      heavyLimit: config.RATE_LIMIT_HEAVY_PER_MIN,
      windowSeconds: 60,
    },
    reply
  );

  if (rate.limited) {
    reply.code(429).send({ ok: false, error: "rate limit exceeded", meta: { retryAfter: rate.retryAfter } });
    return;
  }

  const key = cacheKey(normalized);
  const cached = await readCache(redis, key);

  if (cached) {
    const payload: ApiResponse = {
      ...cached,
      meta: { ...cached.meta, cacheHit: true, durationMs: Date.now() - start },
    };
    reply.send(payload);
    return;
  }

  const engineBaseByKind = {
    v8: config.ENGINE_V8_URL,
    hermes: config.ENGINE_HERMES_URL,
    sm: config.ENGINE_SM_URL,
    jsc: config.ENGINE_JSC_URL,
  } as const;

  const engineBase = engineBaseByKind[normalized.engine];
  const engineUrl = `${engineBase.replace(/\/$/, "")}/run`;

  try {
    const engineRes = await request(engineUrl, {
      method: "POST",
      body: JSON.stringify({
        task: normalized.task,
        sourceText: normalized.sourceText,
        options: { flags: normalized.flags, timeoutMs: normalized.timeoutMs },
      }),
      headers: {
        "content-type": "application/json",
        ...(config.ENGINE_SHARED_SECRET ? { "x-engine-key": config.ENGINE_SHARED_SECRET } : {}),
      },
      bodyTimeout: normalized.timeoutMs + 1000,
      headersTimeout: normalized.timeoutMs + 1000,
    });

    // Prefer undici's body.text() if available, fallback to stream read otherwise.
    const engineText =
      typeof (engineRes.body as any)?.text === "function"
        ? await (engineRes.body as any).text()
        : await new Promise<string>((resolve, reject) => {
            let data = "";
            (engineRes.body as NodeJS.ReadableStream).setEncoding("utf8");
            (engineRes.body as NodeJS.ReadableStream).on("data", (c) => (data += c));
            (engineRes.body as NodeJS.ReadableStream).on("end", () => resolve(data));
            (engineRes.body as NodeJS.ReadableStream).on("error", reject);
          });

    if (engineRes.statusCode < 200 || engineRes.statusCode >= 300) {
      const msg = engineRes.statusCode === 401 ? "engine auth failed" : "engine returned non-2xx";
      req.log.error({ engineUrl, status: engineRes.statusCode, sample: engineText.slice(0, 500) }, msg);
    }

    // 5xx from the engine => treat as Bad Gateway
    if (engineRes.statusCode >= 500) {
      reply.code(502).send({ ok: false, error: `engine unavailable (${engineRes.statusCode})` });
      return;
    }

    let enginePayload: EngineResponse;
    try {
      enginePayload = JSON.parse(engineText) as EngineResponse;
    } catch (e) {
      req.log.error({ status: engineRes.statusCode, sample: engineText.slice(0, 2000) }, "engine returned non-json");
      reply.code(502).send({ ok: false, error: "engine returned invalid response" });
      return;
    }

    if (!enginePayload.ok) {
      const status = mapEngineErrorToStatus(enginePayload as any);
      reply.code(status).send(enginePayload);
      return;
    }

    const response: ApiResponse = {
      ...enginePayload,
      meta: {
        ...(enginePayload.meta || {}),
        durationMs: Date.now() - start,
        engine: normalized.engine,
        cacheHit: false,
      },
    };

    await writeCache(redis, key, response, config.CACHE_TTL_SECONDS);
    reply.send(response);
  } catch (err: any) {
    const classified = classifyEngineError(err);
    req.log.error({ err, engineUrl, kind: classified.kind }, "engine request failed");
    reply.code(502).send({ ok: false, error: classified.message });
  }
});

const listen = async () => {
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`api listening on ${config.HOST}:${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

const shutdown = async () => {
  try {
    await app.close();
  } catch {
    // ignore
  }

  try {
    await redis.quit(); // Graceful shutdown
  } catch {
    try {
      redis.disconnect();
    } catch {
      // ignore
    }
  }

  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

listen();
