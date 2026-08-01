import crypto from "crypto";
import type { FastifyBaseLogger } from "fastify";
import type { Redis } from "ioredis";

/**
 * Self-service API keys for the public API. There's no account system, so a key
 * is an opaque bearer token stored in Redis with a per-minute quota. Requests
 * that present a valid key are rate-limited by key (a higher tier) instead of
 * by IP; requests without one keep the anonymous IP limit.
 */

export const KEY_PREFIX = "jslab_";
const REDIS_PREFIX = "apikey:";

export interface ApiKeyRecord {
  createdAt: number;
  rpm: number;
}

/** True for strings shaped like an issued key (cheap pre-check before Redis). */
export function isValidKeyFormat(key: string): boolean {
  return /^jslab_[0-9a-f]{32}$/.test(key);
}

/**
 * Pull an API key from a request's headers: `x-api-key: <key>` or
 * `Authorization: Bearer <key>`. Returns null when neither is present.
 */
export function extractApiKey(headers: Record<string, unknown>): string | null {
  const xApiKey = headers["x-api-key"];
  if (typeof xApiKey === "string" && xApiKey.trim()) return xApiKey.trim();

  const auth = headers["authorization"];
  if (typeof auth === "string") {
    const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
    if (m) return m[1].trim();
  }
  return null;
}

export function generateApiKey(randomHex: () => string = () => crypto.randomBytes(16).toString("hex")): string {
  return `${KEY_PREFIX}${randomHex()}`;
}

export async function issueApiKey(redis: Redis, rpm: number, now: number, log?: FastifyBaseLogger): Promise<string | null> {
  const key = generateApiKey();
  const record: ApiKeyRecord = { createdAt: now, rpm };
  try {
    await redis.set(`${REDIS_PREFIX}${key}`, JSON.stringify(record));
    return key;
  } catch (err) {
    log?.error({ err }, "failed to persist api key");
    return null;
  }
}

export async function lookupApiKey(redis: Redis, key: string, log?: FastifyBaseLogger): Promise<ApiKeyRecord | null> {
  if (!isValidKeyFormat(key)) return null;
  try {
    const raw = await redis.get(`${REDIS_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApiKeyRecord;
    if (typeof parsed.rpm !== "number") return null;
    return parsed;
  } catch (err) {
    log?.warn({ err }, "api key lookup failed");
    return null;
  }
}
