import crypto from "crypto";
import type { FastifyBaseLogger } from "fastify";
import type { Redis } from "ioredis";

/**
 * Self-service API keys for the public API. There's no account system, so a key
 * is an opaque bearer token stored in Redis with a per-minute quota. Requests
 * that present a valid key are rate-limited by key (a higher tier) instead of
 * by IP; requests without one keep the anonymous IP limit.
 *
 * Known trade-off: this shares the same Redis instance as the response cache
 * and rate limiter, under `--maxmemory-policy allkeys-lru` (see redis.yaml).
 * Records are hashed at rest and TTL'd (see below) so a memory dump or a
 * `SCAN` no longer yields usable plaintext credentials, but they are still
 * eligible for LRU eviction under memory pressure before their TTL — a
 * revoked-feeling 401 with no audit trail. Moving credentials to a separate
 * Redis instance/DB would only avoid *key-name* collisions with the cache,
 * not eviction: `maxmemory-policy` operates instance-wide, across every
 * logical DB. Avoiding eviction-under-pressure entirely needs either a
 * non-evicting policy for this instance or a genuinely separate store — an
 * infra decision, not something this module can fix alone.
 */

export const KEY_PREFIX = "jslab_";
const REDIS_PREFIX = "apikey:";
const OWNER_PREFIX = "apikey-owner:";

export interface ApiKeyRecord {
  createdAt: number;
  rpm: number;
}

/** True for strings shaped like an issued key (cheap pre-check before Redis). */
export function isValidKeyFormat(key: string): boolean {
  return /^jslab_[0-9a-f]{32}$/.test(key);
}

// Keys are bearer credentials, so they're stored by their hash, never in
// plaintext — the Redis key NAME must not itself be the secret. This also
// means `apikey:*` records are no longer distinguishable-by-prefix from any
// other cache entry an operator might scan, which is the point: nothing but
// this process can turn a Redis dump back into a usable key.
function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
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

export type IssueApiKeyResult = { ok: true; key: string } | { ok: false; reason: "owner_limit" | "storage_error" };

/**
 * Issues a key scoped to `ownerHash` (the caller's already-hashed identity —
 * never a raw IP; see rateLimit.ts's windowKey for why). Keys expire after
 * `ttlSeconds` instead of living forever, and `maxPerOwner` bounds how many
 * live keys one owner can hold at once, so issuance can't be farmed into an
 * unlimited pile of permanent, ever-escalating-quota credentials.
 *
 * The owner index is a sorted set scored by expiry: ZREMRANGEBYSCORE first
 * prunes anything already expired (cheap, no separate sweep job needed),
 * *then* ZCARD counts what's left. Both run in one MULTI so a concurrent
 * issuance from the same owner can't race past the limit.
 */
export async function issueApiKey(
  redis: Redis,
  rpm: number,
  now: number,
  ttlSeconds: number,
  ownerHash: string,
  maxPerOwner: number,
  log?: FastifyBaseLogger,
): Promise<IssueApiKeyResult> {
  const ownerSetKey = `${OWNER_PREFIX}${ownerHash}`;
  try {
    const pipeline = redis.multi();
    pipeline.zremrangebyscore(ownerSetKey, "-inf", now);
    pipeline.zcard(ownerSetKey);
    const results = await pipeline.exec();
    const liveCount = results ? Number(results[1]?.[1]) : 0;
    if (Number.isFinite(liveCount) && liveCount >= maxPerOwner) {
      return { ok: false, reason: "owner_limit" };
    }

    const key = generateApiKey();
    const digest = hashKey(key);
    const record: ApiKeyRecord = { createdAt: now, rpm };
    const expiresAt = now + ttlSeconds * 1000;

    const write = redis.multi();
    write.set(`${REDIS_PREFIX}${digest}`, JSON.stringify(record), "EX", ttlSeconds);
    // The owner set's member is the key's hash, not the key itself — it only
    // ever needs to be counted (ZCARD) and pruned by score, never read back.
    write.zadd(ownerSetKey, expiresAt, digest);
    write.expire(ownerSetKey, ttlSeconds);
    await write.exec();

    return { ok: true, key };
  } catch (err) {
    log?.error({ err }, "failed to persist api key");
    return { ok: false, reason: "storage_error" };
  }
}

export async function lookupApiKey(redis: Redis, key: string, log?: FastifyBaseLogger): Promise<ApiKeyRecord | null> {
  if (!isValidKeyFormat(key)) return null;
  try {
    const raw = await redis.get(`${REDIS_PREFIX}${hashKey(key)}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApiKeyRecord;
    if (typeof parsed.rpm !== "number") return null;
    return parsed;
  } catch (err) {
    log?.warn({ err }, "api key lookup failed");
    return null;
  }
}

/** Revokes a key immediately. Presenting the key itself is the only proof of
 * ownership this self-service, accountless system has. */
export async function revokeApiKey(redis: Redis, key: string, log?: FastifyBaseLogger): Promise<boolean> {
  if (!isValidKeyFormat(key)) return false;
  try {
    const deleted = await redis.del(`${REDIS_PREFIX}${hashKey(key)}`);
    return deleted > 0;
  } catch (err) {
    log?.warn({ err }, "api key revocation failed");
    return false;
  }
}
