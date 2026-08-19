import crypto from "node:crypto";
import type { FastifyBaseLogger } from "fastify";
import type { Redis as RedisClient } from "ioredis";
import { cacheEvents } from "./metrics.js";
import type { ApiResponse, EngineResponse, NormalizedRunRequest } from "./types.js";

/**
 * Largest body we will keep in Redis.
 *
 * Redis is shared: it holds this response cache AND the rate limiter's INCR
 * counters, under `--maxmemory 200mb --maxmemory-policy allkeys-lru`. An
 * output-heavy run (--print-all-code and friends) is megabytes, so a few dozen
 * distinct ones would evict the limiter's own state and quietly disable rate
 * limiting — abuse buying itself immunity. Oversized bodies are also the least
 * worth keeping: they are rare, slow to serialise, and rarely re-requested.
 */
export const MAX_CACHE_VALUE_BYTES = 256 * 1024;

/**
 * A cached run result. `status` lets us cache non-200 outcomes (e.g. a
 * deterministic 400 for bad input, or an engine-reported 504 timeout) and
 * replay the same status on a hit, instead of only ever caching successes.
 */
export type CachedResult = {
  status: number;
  body: ApiResponse | EngineResponse | { ok: false; error: string };
};

export function cacheKey(payload: NormalizedRunRequest): string {
  const normalized = {
    engine: payload.engine,
    sourceText: payload.sourceText,
    flags: payload.flags,
    timeoutBucket: Math.ceil(payload.timeoutMs / 100),
  };
  const raw = JSON.stringify(normalized);
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return `api-cache:${hash}`;
}

export async function readCache(
  redis: RedisClient,
  key: string,
  log?: FastifyBaseLogger,
): Promise<CachedResult | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as CachedResult;
  } catch (err) {
    // Fail open (treat as a miss), but surface it: a broken Redis must be
    // distinguishable from a genuine 100%-miss workload.
    log?.warn({ err }, "cache read failed");
    return null;
  }
}

export async function writeCache(
  redis: RedisClient,
  key: string,
  value: CachedResult,
  ttlSeconds: number,
  log?: FastifyBaseLogger,
): Promise<void> {
  // The guard lives here, not at the call site: every cache write goes through
  // this function, so there is no path that can skip it.
  const payload = JSON.stringify(value);
  const bytes = Buffer.byteLength(payload);
  if (bytes > MAX_CACHE_VALUE_BYTES) {
    cacheEvents.inc({ result: "skip_too_large" });
    log?.warn({ bytes, limit: MAX_CACHE_VALUE_BYTES }, "cache write skipped: body over size cap");
    return;
  }

  try {
    await redis.setex(key, ttlSeconds, payload);
  } catch (err) {
    log?.warn({ err }, "cache write failed");
  }
}
