import type { FastifyBaseLogger, FastifyReply } from "fastify";
import type { Redis } from "ioredis";

export type RateLimitResult = {
  limited: boolean;
  retryAfter: number;
  remaining: number;
};

function windowKey(ip: string, suffix: string, windowSeconds: number): string {
  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  return `ratelimit:${suffix}:${ip}:${window}`;
}

async function take(redis: Redis, key: string, limit: number, windowSeconds: number): Promise<{ count: number; ttl: number }> {
  const pipeline = redis.multi();
  pipeline.incr(key);
  pipeline.expire(key, windowSeconds, "NX");
  pipeline.ttl(key);
  const results = await pipeline.exec();
  if (!results) {
    return { count: limit + 1, ttl: windowSeconds };
  }
  const count = Number(results[0][1]);
  const ttl = Math.max(Number(results[2][1]), 1);
  return { count, ttl };
}

/**
 * Checks and consumes one unit of the `suffix` limit for this IP.
 *
 * Sets X-RateLimit-* headers for THIS limit, so the advertised limit always
 * matches the check that actually applied. Callers layer limits explicitly:
 * check "general" for every request, and additionally "heavy" only for
 * requests that spawn an engine (cache misses, trace executions).
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
    ({ count, ttl } = await take(redis, windowKey(ip, suffix, windowSeconds), limit, windowSeconds));
  } catch (err) {
    log?.error({ err, suffix }, "rate limit check failed; failing open");
    return { limited: false, retryAfter: 0, remaining: 0 };
  }

  const limited = count > limit;
  const remaining = Math.max(limit - count, 0);

  reply.header("X-RateLimit-Limit", String(limit));
  reply.header("X-RateLimit-Remaining", String(remaining));
  reply.header("X-RateLimit-Reset", String(Math.floor(Date.now() / 1000) + ttl));
  if (limited) {
    reply.header("Retry-After", String(ttl));
  }

  return { limited, retryAfter: ttl, remaining };
}
