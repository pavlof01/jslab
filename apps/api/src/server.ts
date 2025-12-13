import fastify from "fastify";
import underPressure from "@fastify/under-pressure";
import Redis from "ioredis";
import { request } from "undici";
import { cacheKey, readCache, writeCache } from "./cache.js";
import { loadConfig } from "./config.js";
import { enforceRateLimit } from "./rateLimit.js";
import { allowedFlags, normalizeFlags, runRequestSchema } from "./schemas.js";
import type { ApiResponse, EngineResponse, NormalizedRunRequest } from "./types.js";

const config = loadConfig();
const redis = new Redis(config.REDIS_URL);
const app = fastify({
  logger: { level: config.LOG_LEVEL },
  bodyLimit: config.REQUEST_BODY_LIMIT_BYTES
});

app.register(underPressure);

app.addHook("onRequest", async (req, reply) => {
  if (config.API_KEY) {
    const incoming = req.headers["x-api-key"];
    if (incoming !== config.API_KEY) {
      return reply.code(401).send({ ok: false, error: "invalid api key" });
    }
  }
});

app.get("/healthz", async () => ({ ok: true, redis: redis.status }));

function clientIp(req: any): string {
  const header = req.headers["x-forwarded-for"];
  if (typeof header === "string" && header.length > 0) {
    return header.split(",")[0]?.trim() || req.ip;
  }
  return req.ip;
}

async function readStream(stream: NodeJS.ReadableStream): Promise<string> {
  return await new Promise((resolve, reject) => {
    let data = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => (data += chunk));
    stream.on("end", () => resolve(data));
    stream.on("error", (err) => reject(err));
  });
}

function normalizeRequest(body: any): NormalizedRunRequest {
  const parsed = runRequestSchema.parse(body);
  const timeout = Math.min(parsed.options?.timeoutMs ?? config.DEFAULT_TIMEOUT_MS, config.MAX_TIMEOUT_MS);
  const flags = normalizeFlags(parsed.engine, parsed.options?.flags ?? [], config.MAX_FLAGS);
  if (parsed.sourceText.length > config.MAX_SOURCE_LENGTH) {
    throw new Error(`sourceText exceeds limit (${config.MAX_SOURCE_LENGTH} chars)`);
  }
  return {
    engine: parsed.engine,
    task: parsed.task,
    sourceText: parsed.sourceText,
    flags,
    timeoutMs: timeout
  };
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
    { generalLimit: config.RATE_LIMIT_PER_MIN, heavyLimit: config.RATE_LIMIT_HEAVY_PER_MIN, windowSeconds: 60 },
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
      meta: { ...cached.meta, cacheHit: true, durationMs: Date.now() - start }
    };
    reply.send(payload);
    return;
  }

  const engineUrl =
    normalized.engine === "v8"
      ? `${config.ENGINE_V8_URL.replace(/\\/$/, "")}/run`
      : `${config.ENGINE_HERMES_URL.replace(/\\/$/, "")}/run`;

  try {
    const engineRes = await request(engineUrl, {
      method: "POST",
      body: JSON.stringify({
        task: normalized.task,
        sourceText: normalized.sourceText,
        options: { flags: normalized.flags, timeoutMs: normalized.timeoutMs }
      }),
      headers: {
        "content-type": "application/json",
        ...(config.ENGINE_SHARED_SECRET ? { "x-engine-key": config.ENGINE_SHARED_SECRET } : {})
      },
      bodyTimeout: normalized.timeoutMs + 1000,
      headersTimeout: normalized.timeoutMs + 1000
    });

    if (engineRes.statusCode >= 500) {
      reply.code(502).send({ ok: false, error: `engine unavailable (${engineRes.statusCode})` });
      return;
    }

    const engineText = await readStream(engineRes.body);
    const enginePayload = JSON.parse(engineText) as EngineResponse;
    if (!enginePayload.ok) {
      reply.code(400).send(enginePayload);
      return;
    }

    const response: ApiResponse = {
      ...enginePayload,
      meta: { ...(enginePayload.meta || {}), durationMs: Date.now() - start, engine: normalized.engine, cacheHit: false }
    };

    await writeCache(redis, key, response, config.CACHE_TTL_SECONDS);
    reply.send(response);
  } catch (err: any) {
    req.log.error({ err }, "engine request failed");
    reply.code(502).send({ ok: false, error: "engine request failed" });
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
  await app.close();
  redis.disconnect();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

listen();
