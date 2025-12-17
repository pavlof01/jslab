import crypto from "crypto";
import type { Redis } from "ioredis";
import type { ApiResponse, NormalizedRunRequest } from "./types.js";

export function cacheKey(payload: NormalizedRunRequest): string {
  const normalized = {
    engine: payload.engine,
    task: payload.task,
    sourceText: payload.sourceText,
    flags: payload.flags,
    timeoutBucket: Math.ceil(payload.timeoutMs / 100)
  };
  const raw = JSON.stringify(normalized);
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return `api-cache:${hash}`;
}

export async function readCache(redis: Redis, key: string): Promise<ApiResponse | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as ApiResponse;
  } catch {
    return null;
  }
}

export async function writeCache(redis: Redis, key: string, value: ApiResponse, ttlSeconds: number): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    /* ignore cache failures */
  }
}
