import crypto from "node:crypto";

import type { FastifyBaseLogger, FastifyReply } from "fastify";
import type { Redis } from "ioredis";

export type RateLimitResult = {
  limited: boolean;
  retryAfter: number;
  remaining: number;
};

// Hash rather than embed the raw identity: even with clientIp()'s shape guard
// upstream, this is the layer that must hold on its own — an unbounded or
// unvalidated identity turned directly into a Redis key name lets a caller
// pump arbitrarily many distinct keys into Redis under `allkeys-lru`,
// evicting unrelated keys (including apikey: records) well before any
// per-key TTL would expire them. Truncated to 32 hex chars: this only needs
// to be collision-resistant among concurrent callers, not a general-purpose
// digest. Exported so any other Redis-key derivation from a caller identity
// (e.g. apiKeys.ts's per-owner key limit) uses the same hashing, rather than
// a second raw identity ending up in a Redis key name somewhere else.
export function hashIdentity(identity: string): string {
  return crypto.createHash("sha256").update(identity).digest("hex").slice(0, 32);
}

function windowKey(identity: string, suffix: string, windowSeconds: number): string {
  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  return `ratelimit:${suffix}:${hashIdentity(identity)}:${window}`;
}

async function take(
  redis: Redis,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ count: number; ttl: number }> {
  const pipeline = redis.multi();
  pipeline.incr(key);
  pipeline.expire(key, windowSeconds, "NX");
  pipeline.ttl(key);
  const results = await pipeline.exec();
  if (!results) {
    return { count: limit + 1, ttl: windowSeconds };
  }
  // Each entry is [error, reply]; an errored INCR (e.g. WRONGTYPE after a key
  // collision) must not be read as a numeric result — Number(undefined) is
  // NaN, and `NaN > limit` is false, which would silently admit the request.
  const [incrErr, incrValue] = results[0];
  if (incrErr) throw incrErr;
  const count = Number(incrValue);
  const ttl = Math.max(Number(results[2][1]), 1);
  return { count, ttl };
}

/**
 * Checks and consumes one unit of the `suffix` limit for this IP.
 *
 * Sets X-RateLimit-* headers for THIS limit, so the advertised limit always
 * matches the check that actually applied. Callers layer limits explicitly:
 * check "general" for every request, and additionally "heavy" only for
 * requests that spawn an engine (cache misses, trace executions). Headers are
 * set whether or not the request is limited, so a successful response is just
 * as informative as a 429 — X-RateLimit-Bucket names which of the (possibly
 * several) budgets checked for this request the three numbers describe, since
 * a later check in the same request overwrites the earlier one's headers.
 *
 * Fails open: a Redis error logs and admits the request — the engines have
 * their own per-pod concurrency gates, and turning a Redis blip into a 500
 * (or a full lockout) on every request is worse than briefly not limiting.
 */
export async function enforceLimit(
  redis: Redis,
  ip: string,
  suffix: string,
  limit: number,
  windowSeconds: number,
  reply: FastifyReply,
  log?: FastifyBaseLogger,
): Promise<RateLimitResult> {
  let count: number;
  let ttl: number;
  try {
    ({ count, ttl } = await take(
      redis,
      windowKey(ip, suffix, windowSeconds),
      limit,
      windowSeconds,
    ));
  } catch (err) {
    log?.error({ err, suffix }, "rate limit check failed; failing open");
    return { limited: false, retryAfter: 0, remaining: 0 };
  }

  const limited = count > limit;
  const remaining = Math.max(limit - count, 0);

  reply.header("X-RateLimit-Limit", String(limit));
  reply.header("X-RateLimit-Remaining", String(remaining));
  reply.header("X-RateLimit-Reset", String(Math.floor(Date.now() / 1000) + ttl));
  reply.header("X-RateLimit-Bucket", suffix);
  if (limited) {
    reply.header("Retry-After", String(ttl));
  }

  return { limited, retryAfter: ttl, remaining };
}
