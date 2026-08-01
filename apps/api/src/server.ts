import fastify, { type FastifyBaseLogger } from "fastify";
// @ts-ignore
import apiReference from "@scalar/fastify-api-reference";
import underPressure from "@fastify/under-pressure";
import { Redis } from "ioredis";
import { request } from "undici";
import { cacheKey, readCache, writeCache } from "./cache.js";
import { loadConfig } from "./config.js";
import { openapiDoc } from "./openapi.js";
import { enforceLimit } from "./rateLimit.js";
import { extractApiKey, issueApiKey, lookupApiKey } from "./apiKeys.js";
import { normalizeFlags, runRequestSchema, traceExecuteRequestSchema, traceExecuteEqualitySchema, validationMessage } from "./schemas.js";
import { registry, runsTotal, cacheEvents, rateLimited, runDuration } from "./metrics.js";
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
  trustProxy: true
});

// Under pressure (it's better to set thresholds explicitly)
app.register(underPressure, {
  maxEventLoopDelay: 1000,
  maxHeapUsedBytes: 1024 * 1024 * 1024, // 1GB (tune for your VM)
  message: "under pressure",
  retryAfter: 10,
});

app.get("/healthz", async () => ({ ok: true, redis: redis.status }));

app.get("/metrics", async (_req, reply) => {
  reply.header("Content-Type", registry.contentType);
  return registry.metrics();
});

app.get("/api/openapi.json", async () => openapiDoc);

app.register(apiReference, {
  routePrefix: "/api/docs",
  configuration: {
    content: openapiDoc
  }
});

function clientIp(req: any): string {
  // With trustProxy=true, Fastify will compute req.ip correctly behind trusted proxies.
  // Do not parse x-forwarded-for manually to avoid letting clients spoof it.
  return req.ip;
}

type Budget = {
  id: string;
  generalSuffix: string;
  heavySuffix: string;
  generalLimit: number;
  heavyLimit: number;
};

/**
 * Determines which rate-limit budget applies to a request. A valid API key is
 * limited by key at the higher key tier; anonymous requests keep the IP limit.
 * Sends 401 and returns null when a key is present but invalid.
 */
async function resolveBudget(req: any, reply: any): Promise<Budget | null> {
  const key = extractApiKey(req.headers ?? {});
  if (key) {
    const record = await lookupApiKey(redis, key, req.log);
    if (!record) {
      reply.code(401).send({ ok: false, error: "invalid API key" });
      return null;
    }
    return { id: key, generalSuffix: "key-general", heavySuffix: "key-heavy", generalLimit: record.rpm, heavyLimit: record.rpm };
  }
  return {
    id: clientIp(req),
    generalSuffix: "general",
    heavySuffix: "heavy",
    generalLimit: config.RATE_LIMIT_PER_MIN,
    heavyLimit: config.RATE_LIMIT_HEAVY_PER_MIN,
  };
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

function classifyUpstreamError(serviceName: string, err: any): { kind: string; message: string } {
  const code = err?.code;
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return { kind: "dns", message: `${serviceName} DNS lookup failed` };
  }
  if (code === "ECONNREFUSED") {
    return { kind: "connect_refused", message: `${serviceName} connection refused` };
  }
  if (code === "UND_ERR_CONNECT_TIMEOUT" || code === "ETIMEDOUT") {
    return { kind: "connect_timeout", message: `${serviceName} connect timeout` };
  }
  if (code === "UND_ERR_HEADERS_TIMEOUT") {
    return { kind: "headers_timeout", message: `${serviceName} headers timeout` };
  }
  if (code === "UND_ERR_BODY_TIMEOUT") {
    return { kind: "body_timeout", message: `${serviceName} body timeout` };
  }
  return { kind: "request_error", message: `${serviceName} request failed` };
}

async function readResponseText(body: unknown): Promise<string> {
  if (typeof (body as any)?.text === "function") {
    return await (body as any).text();
  }

  return await new Promise<string>((resolve, reject) => {
    let data = "";
    (body as NodeJS.ReadableStream).setEncoding("utf8");
    (body as NodeJS.ReadableStream).on("data", (chunk) => (data += chunk));
    (body as NodeJS.ReadableStream).on("end", () => resolve(data));
    (body as NodeJS.ReadableStream).on("error", reject);
  });
}

type RunResult = {
  status: number;
  body: ApiResponse | EngineResponse | { ok: false; error: string };
  // How to cache this outcome: "positive" = full TTL, "negative" = short TTL
  // (deterministic failures only), "none" = don't cache (transient/backpressure).
  cache: "positive" | "negative" | "none";
  retryAfter?: string;
};

// In-process single-flight: concurrent identical requests coalesce onto one
// engine execution instead of each spawning a process. Without this, a burst
// on one cold-but-popular snippet fills the engine's concurrency gate and
// everyone gets 429, when a single run could have served them all.
const inFlight = new Map<string, Promise<RunResult>>();

const engineBaseByKind = {
  v8: () => config.ENGINE_V8_URL,
  hermes: () => config.ENGINE_HERMES_URL,
  sm: () => config.ENGINE_SM_URL,
  jsc: () => config.ENGINE_JSC_URL,
} as const;

async function executeRun(normalized: NormalizedRunRequest, log: FastifyBaseLogger): Promise<RunResult> {
  const start = Date.now();
  const engineUrl = `${engineBaseByKind[normalized.engine]().replace(/\/$/, "")}/run`;

  try {
    const engineBody = { sourceText: normalized.sourceText, options: { flags: normalized.flags, timeoutMs: normalized.timeoutMs } };

    const engineRes = await request(engineUrl, {
      method: "POST",
      body: JSON.stringify(engineBody),
      headers: { "content-type": "application/json" },
      bodyTimeout: normalized.timeoutMs + 1000,
      headersTimeout: normalized.timeoutMs + 1000,
    });

    const engineText = await readResponseText(engineRes.body);

    if (engineRes.statusCode < 200 || engineRes.statusCode >= 300) {
      log.error({ engineUrl, status: engineRes.statusCode, sample: engineText.slice(0, 500) }, "engine returned non-2xx");
    }

    // Engine signals backpressure (its per-pod concurrency cap) with 429.
    // Propagate it verbatim with Retry-After; never cache it.
    if (engineRes.statusCode === 429) {
      let body: any;
      try {
        body = JSON.parse(engineText);
      } catch {
        body = { ok: false, error: "engine busy" };
      }
      const retryAfter = engineRes.headers["retry-after"];
      return { status: 429, body, cache: "none", retryAfter: retryAfter ? String(retryAfter) : undefined };
    }

    // 5xx from the engine => transient; treat as Bad Gateway, don't cache.
    if (engineRes.statusCode >= 500) {
      return { status: 502, body: { ok: false, error: `engine unavailable (${engineRes.statusCode})` }, cache: "none" };
    }

    let enginePayload: EngineResponse;
    try {
      enginePayload = JSON.parse(engineText) as EngineResponse;
    } catch {
      log.error({ status: engineRes.statusCode, sample: engineText.slice(0, 2000) }, "engine returned non-json");
      return { status: 502, body: { ok: false, error: "engine returned invalid response" }, cache: "none" };
    }

    if (!enginePayload.ok) {
      const status = mapEngineErrorToStatus(enginePayload as any);
      // Bad input (400) and engine-reported timeout (504) are deterministic for
      // a given snippet, so cache them briefly to stop re-burning engine slots.
      // Everything else (502/429/…) is transient and stays uncached.
      const cache = status === 400 || status === 504 ? "negative" : "none";
      return { status, body: enginePayload, cache };
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
    return { status: 200, body: response, cache: "positive" };
  } catch (err: any) {
    const classified = classifyUpstreamError("engine", err);
    log.error({ err, engineUrl, kind: classified.kind }, "engine request failed");
    return { status: 502, body: { ok: false, error: classified.message }, cache: "none" };
  }
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

  const budget = await resolveBudget(req, reply);
  if (!budget) return; // invalid API key → 401 already sent

  const general = await enforceLimit(redis, budget.id, budget.generalSuffix, budget.generalLimit, 60, reply, req.log);
  if (general.limited) {
    rateLimited.inc({ budget: budget.generalSuffix });
    reply.code(429).send({ ok: false, error: "rate limit exceeded", meta: { retryAfter: general.retryAfter } });
    return;
  }

  const isDev = process.env.NODE_ENV !== "production";
  const key = cacheKey(normalized);
  const cached = isDev ? null : await readCache(redis, key, req.log);

  if (cached) {
    cacheEvents.inc({ result: "hit" });
    runsTotal.inc({ engine: normalized.engine, outcome: "cache_hit" });
    // Replay the cached status. For a 200 ApiResponse, refresh the per-request
    // meta so cacheHit/durationMs reflect this request, not the cached one.
    const body =
      cached.status === 200 && cached.body && "meta" in cached.body
        ? { ...(cached.body as ApiResponse), meta: { ...(cached.body as ApiResponse).meta, cacheHit: true, durationMs: Date.now() - start } }
        : cached.body;
    reply.code(cached.status).send(body);
    return;
  }
  if (!isDev) cacheEvents.inc({ result: "miss" });

  // Only cache misses spawn an engine process, so only they consume the
  // (stricter) heavy budget. Cache hits stay cheap for the client.
  const heavy = await enforceLimit(redis, budget.id, budget.heavySuffix, budget.heavyLimit, 60, reply, req.log);
  if (heavy.limited) {
    rateLimited.inc({ budget: budget.heavySuffix });
    reply.code(429).send({ ok: false, error: "rate limit exceeded", meta: { retryAfter: heavy.retryAfter } });
    return;
  }

  let result: RunResult;
  const existing = inFlight.get(key);
  if (existing) {
    // Coalesce onto the in-flight execution; followers don't re-run or re-cache.
    result = await existing;
  } else {
    const p = executeRun(normalized, req.log);
    inFlight.set(key, p);
    try {
      result = await p;
    } finally {
      inFlight.delete(key);
    }
    if (!isDev && result.cache !== "none") {
      const ttl = result.cache === "positive" ? config.CACHE_TTL_SECONDS : config.NEGATIVE_CACHE_TTL_SECONDS;
      await writeCache(redis, key, { status: result.status, body: result.body }, ttl, req.log);
    }
  }

  const outcome = result.status === 200 ? "ok" : result.status === 429 ? "engine_busy" : "error";
  runsTotal.inc({ engine: normalized.engine, outcome });
  runDuration.observe({ engine: normalized.engine, outcome }, (Date.now() - start) / 1000);

  if (result.retryAfter) reply.header("retry-after", result.retryAfter);
  reply.code(result.status).send(result.body);
});

async function proxyToTraceService(
  req: any,
  reply: any,
  upstreamPath: string,
  body: unknown,
) {
  const traceServiceUrl = `${config.TRACE_SERVICE_URL.replace(/\/$/, "")}${upstreamPath}`;

  try {
    const traceRes = await request(traceServiceUrl, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      bodyTimeout: config.MAX_TIMEOUT_MS + 1000,
      headersTimeout: config.MAX_TIMEOUT_MS + 1000,
    });

    const traceText = await readResponseText(traceRes.body);

    let tracePayload: unknown;
    try {
      tracePayload = JSON.parse(traceText);
    } catch {
      req.log.error({ status: traceRes.statusCode, sample: traceText.slice(0, 2000) }, "trace-service returned non-json");
      reply.code(502).send({ ok: false, error: "trace-service returned invalid response" });
      return;
    }

    reply.code(traceRes.statusCode).send(tracePayload);
  } catch (err: any) {
    const classified = classifyUpstreamError("trace-service", err);
    req.log.error({ err, traceServiceUrl, kind: classified.kind }, "trace-service request failed");
    reply.code(502).send({ ok: false, error: classified.message });
  }
}

// Trace executions run engine262 over user input, so they are as heavy as an
// engine run and must be metered. They share the same budget resolution as
// /api/run (API key or IP) so a client can't dodge the limit by switching
// endpoints. Returns true if the request was rate-limited or rejected (401).
async function enforceTraceRateLimit(req: any, reply: any): Promise<boolean> {
  const budget = await resolveBudget(req, reply);
  if (!budget) return true; // invalid API key → 401 already sent
  const general = await enforceLimit(redis, budget.id, budget.generalSuffix, budget.generalLimit, 60, reply, req.log);
  if (general.limited) {
    rateLimited.inc({ budget: budget.generalSuffix });
    reply.code(429).send({ ok: false, error: "rate limit exceeded", meta: { retryAfter: general.retryAfter } });
    return true;
  }
  const heavy = await enforceLimit(redis, budget.id, budget.heavySuffix, budget.heavyLimit, 60, reply, req.log);
  if (heavy.limited) {
    rateLimited.inc({ budget: budget.heavySuffix });
    reply.code(429).send({ ok: false, error: "rate limit exceeded", meta: { retryAfter: heavy.retryAfter } });
    return true;
  }
  return false;
}

// Self-service public-API key issuance. No accounts: anyone can mint a key,
// but issuance is IP-limited to curb abuse. A key raises the request quota.
app.post("/api/keys", async (req, reply) => {
  const ip = clientIp(req);
  const issue = await enforceLimit(redis, ip, "key-issue", config.API_KEY_ISSUE_PER_HOUR, 3600, reply, req.log);
  if (issue.limited) {
    reply.code(429).send({ ok: false, error: "key issuance limit reached", meta: { retryAfter: issue.retryAfter } });
    return;
  }
  const key = await issueApiKey(redis, config.API_KEY_RATE_LIMIT_PER_MIN, Date.now(), req.log);
  if (!key) {
    reply.code(503).send({ ok: false, error: "could not issue key" });
    return;
  }
  reply.code(201).send({
    ok: true,
    apiKey: key,
    rateLimitPerMin: config.API_KEY_RATE_LIMIT_PER_MIN,
    usage: "Send the key as an 'x-api-key' header or 'Authorization: Bearer <key>' on /api/run and /api/trace/*.",
  });
});

app.post("/api/trace/execute/type-conversion", async (req, reply) => {
  const parsed = traceExecuteRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    reply.code(400).send({ ok: false, error: parsed.error.issues[0]?.message ?? "invalid payload" });
    return;
  }
  if (await enforceTraceRateLimit(req, reply)) return;
  await proxyToTraceService(req, reply, "/execute/type-conversion", parsed.data);
});

app.post("/api/trace/execute/equality", async (req, reply) => {
  const parsed = traceExecuteEqualitySchema.safeParse(req.body);
  if (!parsed.success) {
    reply.code(400).send({ ok: false, error: parsed.error.issues[0]?.message ?? "invalid payload" });
    return;
  }
  if (await enforceTraceRateLimit(req, reply)) return;
  await proxyToTraceService(req, reply, "/execute/equality", parsed.data);
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
