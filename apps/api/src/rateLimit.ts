import type { FastifyReply } from "fastify";
import type { Redis } from "ioredis";
import type { TaskKind } from "./types";

export type RateLimitConfig = {
  generalLimit: number;
  heavyLimit: number;
  windowSeconds: number;
};

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

export async function enforceRateLimit(redis: Redis, ip: string, task: TaskKind, cfg: RateLimitConfig, reply: FastifyReply): Promise<RateLimitResult> {
  const generalKey = windowKey(ip, "general", cfg.windowSeconds);
  const heavyKey = windowKey(ip, "heavy", cfg.windowSeconds);

  const [{ count: generalCount, ttl: generalTtl }, { count: heavyCount, ttl: heavyTtl }] = await Promise.all([
    take(redis, generalKey, cfg.generalLimit, cfg.windowSeconds),
    task === "run" || task === "bytecode"
      ? take(redis, heavyKey, cfg.heavyLimit, cfg.windowSeconds)
      : Promise.resolve({ count: 0, ttl: cfg.windowSeconds })
  ]);

  const overGeneral = generalCount > cfg.generalLimit;
  const overHeavy = (task === "run" || task === "bytecode") && heavyCount > cfg.heavyLimit;
  const limited = overGeneral || overHeavy;
  const retryAfter = overHeavy ? heavyTtl : generalTtl;
  const remaining = Math.max(cfg.generalLimit - generalCount, 0);

  reply.header("X-RateLimit-Limit", String(cfg.generalLimit));
  reply.header("X-RateLimit-Remaining", String(Math.max(remaining, 0)));
  reply.header("X-RateLimit-Reset", String(Math.floor(Date.now() / 1000) + retryAfter));
  if (limited) {
    reply.header("Retry-After", String(retryAfter));
  }

  return { limited, retryAfter, remaining };
}
