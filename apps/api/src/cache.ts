import crypto from "crypto";
import type { FastifyBaseLogger } from "fastify";
import type { Redis as RedisClient } from "ioredis";
import type { ApiResponse, EngineResponse, NormalizedRunRequest } from "./types.js";

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
    timeoutBucket: Math.ceil(payload.timeoutMs / 100)
  };
  const raw = JSON.stringify(normalized);
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return `api-cache:${hash}`;
}

export async function readCache(redis: RedisClient, key: string, log?: FastifyBaseLogger): Promise<CachedResult | null> {
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

export async function writeCache(redis: RedisClient, key: string, value: CachedResult, ttlSeconds: number, log?: FastifyBaseLogger): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    log?.warn({ err }, "cache write failed");
  }
}
