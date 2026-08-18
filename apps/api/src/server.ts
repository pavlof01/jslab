import fastify, { type FastifyBaseLogger, type FastifyRequest } from "fastify";
import apiReference from "@scalar/fastify-api-reference";
import underPressure from "@fastify/under-pressure";
import { Redis } from "ioredis";
import { request } from "undici";
import { cacheKey, readCache, writeCache } from "./cache.js";
import { loadConfig } from "./config.js";
import { openapiDoc } from "./openapi.js";
import { enforceLimit, hashIdentity } from "./rateLimit.js";
import { extractApiKey, issueApiKey, lookupApiKey, revokeApiKey } from "./apiKeys.js";
import {
  flagSpecs,
  normalizeFlags,
  runRequestSchema,
  traceExecuteRequestSchema,
  traceExecuteEqualitySchema,
  validationMessage,
  clampTimeout,
} from "./schemas.js";
import { registry, runsTotal, cacheEvents, rateLimited, runDuration } from "./metrics.js";
import type { ApiResponse, EngineResponse, NormalizedRunRequest } from "./types.js";

const config = loadConfig();

const redis = new Redis(config.REDIS_URL, {
  // Small win: fail faster on network/Redis issues instead of hanging too long.
  maxRetriesPerRequest: 2,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  commandTimeout: config.REDIS_COMMAND_TIMEOUT_MS,
});

const app = fastify({
  logger: { level: config.LOG_LEVEL },
  bodyLimit: config.REQUEST_BODY_LIMIT_BYTES,

  trustProxy: config.TRUST_PROXY_HOPS
});

app.register(underPressure, {
  maxEventLoopDelay: 1000,
  maxHeapUsedBytes: 480 * 1024 * 1024,
  maxRssBytes: 600 * 1024 * 1024,
  message: "under pressure",
  retryAfter: 10,
});

app.get("/healthz", async () => ({ ok: true, redis: redis.status }));

app.get("/metrics", async (_req, reply) => {
  reply.header("Content-Type", registry.contentType);
  return registry.metrics();
});

app.get("/api/openapi.json", async () => openapiDoc);

const flagsDoc = {
  ok: true,
  engines: Object.fromEntries(
    (["v8", "hermes", "sm", "jsc"] as const).map((engine) => [
      engine,
      flagSpecs(engine).map((spec) => ({
        flag: spec.flag,
        description: spec.description,
        category: spec.category,
        ...(spec.takesValue ? { takesValue: true, valuePattern: spec.valuePattern?.source } : {}),
      })),
    ]),
  ),
};

app.get("/api/flags", async () => flagsDoc);

app.register(apiReference, {
  routePrefix: "/api/docs",
  configuration: {
    content: openapiDoc
  }
});

const IP_SHAPE = /^[0-9a-fA-F.:]{1,64}$/;

function clientIp(req: FastifyRequest): string {
  const header = config.CLIENT_IP_HEADER;
  if (header) {
    const raw = req.headers[header];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value && IP_SHAPE.test(value)) return value;
  }
  return IP_SHAPE.test(req.ip) ? req.ip : "unknown";
}

type Budget = {
  id: string;
  generalSuffix: string;
  heavySuffix: string;
  traceSuffix: string;
  generalLimit: number;
  heavyLimit: number;
  traceLimit: number;
};

async function resolveBudget(req: any, reply: any): Promise<Budget | null> {
  const key = extractApiKey(req.headers ?? {});
  if (key) {
    const record = await lookupApiKey(redis, key, req.log);
    if (!record) {
      const ip = clientIp(req);
      const general = await enforceLimit(redis, ip, "general", config.RATE_LIMIT_PER_MIN, 60, reply, req.log);
      if (general.limited) {
        rateLimited.inc({ budget: "general" });
        reply.code(429).send({ ok: false, error: "rate limit exceeded", meta: { retryAfter: general.retryAfter } });
        return null;
      }
      reply.code(401).send({ ok: false, error: "invalid API key" });
      return null;
    }
    return {
      id: key,
      generalSuffix: "key-general",
      heavySuffix: "key-heavy",
      traceSuffix: "key-trace",
      generalLimit: record.rpm,
      heavyLimit: Math.min(record.rpm, config.API_KEY_HEAVY_RATE_LIMIT_PER_MIN),
      traceLimit: record.rpm,
    };
  }
  return {
    id: clientIp(req),
    generalSuffix: "general",
    heavySuffix: "heavy",
    traceSuffix: "trace",
    generalLimit: config.RATE_LIMIT_PER_MIN,
    heavyLimit: config.RATE_LIMIT_HEAVY_PER_MIN,
    traceLimit: config.TRACE_RATE_LIMIT_PER_MIN,
  };
}

function normalizeRequest(body: unknown): NormalizedRunRequest {
  const parsed = runRequestSchema.parse(body);

  const timeoutMs = clampTimeout(parsed.options?.timeoutMs, {
    min: config.MIN_TIMEOUT_MS,
    max: config.MAX_TIMEOUT_MS,
    fallback: config.DEFAULT_TIMEOUT_MS,
  });

  const { flags, dropped } = normalizeFlags(parsed.engine, parsed.options?.flags ?? [], config.MAX_FLAGS);

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

function withDroppedFlags(body: RunResult["body"], droppedFlags: string[]): RunResult["body"] {
  if (!droppedFlags.length || !body || !("meta" in body)) return body;
  return { ...body, meta: { ...(body as ApiResponse).meta, droppedFlags } } as RunResult["body"];
}

function mapEngineErrorToStatus(engineStatusCode: number): number {
  if (engineStatusCode === 408) return 504;
  if (engineStatusCode === 400) return 400;
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
  if (code === "UPSTREAM_RESPONSE_TOO_LARGE") {
    return { kind: "response_too_large", message: `${serviceName} response too large` };
  }
  return { kind: "request_error", message: `${serviceName} request failed` };
}

const MAX_UPSTREAM_RESPONSE_BYTES = 4 * 1024 * 1024;

async function readResponseText(body: AsyncIterable<Buffer | string>, maxBytes = MAX_UPSTREAM_RESPONSE_BYTES): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of body) {
    const buf = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
    total += buf.length;
    if (total > maxBytes) {
      const err = new Error(`upstream response exceeds ${maxBytes} bytes`) as Error & { code: string };
      err.code = "UPSTREAM_RESPONSE_TOO_LARGE";
      throw err;
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString("utf8");
}

type RunResult = {
  status: number;
  body: ApiResponse | EngineResponse | { ok: false; error: string };
  cache: "positive" | "negative" | "none";
  retryAfter?: string;
};

const inFlight = new Map<string, Promise<RunResult>>();

const engineBaseByKind = {
  v8: config.ENGINE_V8_URL,
  hermes: config.ENGINE_HERMES_URL,
  sm: config.ENGINE_SM_URL,
  jsc: config.ENGINE_JSC_URL,
} as const;

async function executeRun(normalized: NormalizedRunRequest, log: FastifyBaseLogger): Promise<RunResult> {
  const start = Date.now();
  const engineUrl = `${engineBaseByKind[normalized.engine].replace(/\/$/, "")}/run`;

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
      const status = mapEngineErrorToStatus(engineRes.statusCode);
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
    const body =
      cached.status === 200 && cached.body && "meta" in cached.body
        ? { ...(cached.body as ApiResponse), meta: { ...(cached.body as ApiResponse).meta, cacheHit: true, durationMs: Date.now() - start } }
        : cached.body;
    reply.code(cached.status).send(withDroppedFlags(body, normalized.droppedFlags));
    return;
  }
  if (!isDev) cacheEvents.inc({ result: "miss" });

  const heavy = await enforceLimit(redis, budget.id, budget.heavySuffix, budget.heavyLimit, 60, reply, req.log);
  if (heavy.limited) {
    rateLimited.inc({ budget: budget.heavySuffix });
    reply.code(429).send({ ok: false, error: "rate limit exceeded", meta: { retryAfter: heavy.retryAfter } });
    return;
  }

  let result: RunResult;
  const existing = inFlight.get(key);
  if (existing) {
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
  reply.code(result.status).send(withDroppedFlags(result.body, normalized.droppedFlags));
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

    const retryAfter = traceRes.headers["retry-after"];
    if (retryAfter !== undefined) {
      reply.header("retry-after", String(retryAfter));
      const seconds = Number(retryAfter);
      if (tracePayload && typeof tracePayload === "object" && !Array.isArray(tracePayload)) {
        const meta = (tracePayload as { meta?: Record<string, unknown> }).meta;
        if (meta?.retryAfter === undefined) {
          tracePayload = {
            ...(tracePayload as Record<string, unknown>),
            meta: { ...(meta ?? {}), retryAfter: Number.isFinite(seconds) ? seconds : String(retryAfter) },
          };
        }
      }
    }

    reply.code(traceRes.statusCode).send(tracePayload);
  } catch (err: any) {
    const classified = classifyUpstreamError("trace-service", err);
    req.log.error({ err, traceServiceUrl, kind: classified.kind }, "trace-service request failed");
    reply.code(502).send({ ok: false, error: classified.message });
  }
}

async function enforceTraceRateLimit(req: any, reply: any): Promise<boolean> {
  const budget = await resolveBudget(req, reply);
  if (!budget) return true; // invalid API key → 401 already sent
  const general = await enforceLimit(redis, budget.id, budget.generalSuffix, budget.generalLimit, 60, reply, req.log);
  if (general.limited) {
    rateLimited.inc({ budget: budget.generalSuffix });
    reply.code(429).send({ ok: false, error: "rate limit exceeded", meta: { retryAfter: general.retryAfter } });
    return true;
  }
  const trace = await enforceLimit(redis, budget.id, budget.traceSuffix, budget.traceLimit, 60, reply, req.log);
  if (trace.limited) {
    rateLimited.inc({ budget: budget.traceSuffix });
    reply.code(429).send({ ok: false, error: "rate limit exceeded", meta: { retryAfter: trace.retryAfter } });
    return true;
  }
  return false;
}

function requireJsonContentType(req: any, reply: any): boolean {
  const contentType = String(req.headers["content-type"] ?? "");
  if (contentType.split(";")[0].trim().toLowerCase() === "application/json") return true;
  reply.code(415).send({ ok: false, error: "Content-Type must be application/json" });
  return false;
}

app.post("/api/keys", async (req, reply) => {
  if (!requireJsonContentType(req, reply)) return;
  const ip = clientIp(req);
  const issue = await enforceLimit(redis, ip, "key-issue", config.API_KEY_ISSUE_PER_HOUR, 3600, reply, req.log);
  if (issue.limited) {
    reply.code(429).send({ ok: false, error: "key issuance limit reached", meta: { retryAfter: issue.retryAfter } });
    return;
  }
  const result = await issueApiKey(
    redis,
    config.API_KEY_RATE_LIMIT_PER_MIN,
    Date.now(),
    config.API_KEY_TTL_SECONDS,
    hashIdentity(ip),
    config.API_KEY_MAX_PER_ISSUER,
    req.log,
  );
  if (!result.ok) {
    if (result.reason === "owner_limit") {
      reply.code(429).send({ ok: false, error: "too many live keys for this address; revoke one before minting another" });
      return;
    }
    reply.code(503).send({ ok: false, error: "could not issue key" });
    return;
  }
  reply.code(201).send({
    ok: true,
    apiKey: result.key,
    rateLimitPerMin: config.API_KEY_RATE_LIMIT_PER_MIN,
    expiresInSeconds: config.API_KEY_TTL_SECONDS,
    usage: "Send the key as an 'x-api-key' header or 'Authorization: Bearer <key>' on /api/run and /api/trace/*.",
  });
});

app.delete("/api/keys", async (req, reply) => {
  const key = extractApiKey(req.headers ?? {});
  if (!key) {
    reply.code(400).send({ ok: false, error: "no API key presented" });
    return;
  }
  const revoked = await revokeApiKey(redis, key, req.log);
  reply.code(revoked ? 200 : 404).send({ ok: revoked });
});

type TraceBodySchema = {
  safeParse: (
    body: unknown,
  ) => { success: true; data: unknown } | { success: false; error: { issues: Array<{ message: string }> } };
};

function registerTraceExecuteRoute(name: "type-conversion" | "equality", schema: TraceBodySchema) {
  app.post(`/api/trace/execute/${name}`, async (req, reply) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ ok: false, error: parsed.error.issues[0]?.message ?? "invalid payload" });
      return;
    }
    if (await enforceTraceRateLimit(req, reply)) return;
    await proxyToTraceService(req, reply, `/execute/${name}`, parsed.data);
  });
}

registerTraceExecuteRoute("type-conversion", traceExecuteRequestSchema);
registerTraceExecuteRoute("equality", traceExecuteEqualitySchema);

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
