import { describe, expect, it, vi } from "vitest";
import type { FastifyReply } from "fastify";
import type { Redis } from "ioredis";
import { enforceLimit, hashIdentity } from "./rateLimit.js";
import { createFakeRedis } from "./test-support/fakeRedis.js";

function fakeReply() {
  const headers: Record<string, string> = {};
  const reply = {
    header(name: string, value: string) {
      headers[name] = value;
      return reply;
    },
  };
  return { reply: reply as unknown as FastifyReply, headers };
}

const silentLog = { error: vi.fn(), warn: vi.fn() } as any;

describe("hashIdentity", () => {
  it("is deterministic and fixed-width", () => {
    expect(hashIdentity("1.2.3.4")).toBe(hashIdentity("1.2.3.4"));
    expect(hashIdentity("1.2.3.4")).toHaveLength(32);
    expect(hashIdentity("1.2.3.4")).toMatch(/^[0-9a-f]{32}$/);
  });

  it("never echoes the identity it was given", () => {
    // The whole point: a caller-controlled string must not become a Redis key.
    expect(hashIdentity("1.2.3.4")).not.toContain("1.2.3.4");
    expect(hashIdentity("1.2.3.4")).not.toBe(hashIdentity("1.2.3.5"));
  });

  it("handles identities of any length", () => {
    expect(hashIdentity("")).toMatch(/^[0-9a-f]{32}$/);
    expect(hashIdentity("x".repeat(100_000))).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("enforceLimit", () => {
  it("admits requests up to the limit and reports what is left", async () => {
    const redis = createFakeRedis();
    const { reply, headers } = fakeReply();

    const first = await enforceLimit(redis.client, "ip", "general", 3, 60, reply);
    expect(first).toMatchObject({ limited: false, remaining: 2 });
    expect(headers["X-RateLimit-Limit"]).toBe("3");
    expect(headers["X-RateLimit-Remaining"]).toBe("2");
    expect(Number(headers["X-RateLimit-Reset"])).toBeGreaterThan(Date.now() / 1000);
    expect(headers["Retry-After"]).toBeUndefined();

    await enforceLimit(redis.client, "ip", "general", 3, 60, reply);
    const third = await enforceLimit(redis.client, "ip", "general", 3, 60, reply);
    expect(third).toMatchObject({ limited: false, remaining: 0 });
  });

  it("limits the request past the cap and sets Retry-After", async () => {
    const redis = createFakeRedis();
    const { reply, headers } = fakeReply();

    await enforceLimit(redis.client, "ip", "general", 1, 60, reply);
    const limited = await enforceLimit(redis.client, "ip", "general", 1, 60, reply);

    expect(limited.limited).toBe(true);
    expect(limited.remaining).toBe(0);
    expect(limited.retryAfter).toBeGreaterThan(0);
    expect(headers["Retry-After"]).toBe(String(limited.retryAfter));
  });

  it("keeps separate counters per suffix and per identity", async () => {
    const redis = createFakeRedis();
    const { reply } = fakeReply();

    await enforceLimit(redis.client, "ip-a", "general", 1, 60, reply);
    expect((await enforceLimit(redis.client, "ip-a", "heavy", 1, 60, reply)).limited).toBe(false);
    expect((await enforceLimit(redis.client, "ip-b", "general", 1, 60, reply)).limited).toBe(false);
    expect((await enforceLimit(redis.client, "ip-a", "general", 1, 60, reply)).limited).toBe(true);
  });

  it("rejects everything when the limit is zero", async () => {
    const redis = createFakeRedis();
    const { reply } = fakeReply();
    expect((await enforceLimit(redis.client, "ip", "general", 0, 60, reply)).limited).toBe(true);
  });

  it("stores the identity hashed, never in the Redis key name", async () => {
    const redis = createFakeRedis();
    const { reply } = fakeReply();
    await enforceLimit(redis.client, "203.0.113.9", "general", 5, 60, reply);

    const key = redis.keys()[0];
    expect(key).toMatch(/^ratelimit:general:[0-9a-f]{32}:\d+$/);
    expect(key).not.toContain("203.0.113.9");
  });

  it("fails open and logs when Redis is unreachable", async () => {
    const redis = createFakeRedis();
    redis.failCommands = true;
    const { reply, headers } = fakeReply();

    const result = await enforceLimit(redis.client, "ip", "general", 1, 60, reply, silentLog);

    expect(result).toEqual({ limited: false, retryAfter: 0, remaining: 0 });
    // No headers on a failed check: advertising a limit we did not apply would lie.
    expect(headers).toEqual({});
    expect(silentLog.error).toHaveBeenCalled();
  });

  it("fails open rather than admitting the request when INCR itself errors", async () => {
    // A WRONGTYPE on the counter key must not read as "count is NaN, so allow".
    const broken = {
      multi: () => {
        const chain: any = {
          incr: () => chain,
          expire: () => chain,
          ttl: () => chain,
          exec: async () => [[new Error("WRONGTYPE"), undefined], [null, 1], [null, 60]],
        };
        return chain;
      },
    } as unknown as Redis;

    const { reply, headers } = fakeReply();
    const result = await enforceLimit(broken, "ip", "general", 1, 60, reply, silentLog);
    // Every field, not just `limited`: an errored INCR read as a number gives
    // NaN, and `NaN > limit` is false — so `limited: false` alone is true on
    // both the guarded path and the bug it guards against.
    expect(result).toEqual({ limited: false, retryAfter: 0, remaining: 0 });
    expect(headers).toEqual({});
    expect(silentLog.error).toHaveBeenCalled();
  });

  it("treats a null exec (aborted transaction) as over the limit", async () => {
    const aborted = {
      multi: () => {
        const chain: any = {
          incr: () => chain,
          expire: () => chain,
          ttl: () => chain,
          exec: async () => null,
        };
        return chain;
      },
    } as unknown as Redis;

    const { reply } = fakeReply();
    const result = await enforceLimit(aborted, "ip", "general", 5, 60, reply);
    expect(result.limited).toBe(true);
    expect(result.retryAfter).toBe(60);
  });

  it("floors a missing TTL at one second so Retry-After is never zero", async () => {
    const noTtl = {
      multi: () => {
        const chain: any = {
          incr: () => chain,
          expire: () => chain,
          ttl: () => chain,
          exec: async () => [[null, 9], [null, 1], [null, -1]],
        };
        return chain;
      },
    } as unknown as Redis;

    const { reply } = fakeReply();
    const result = await enforceLimit(noTtl, "ip", "general", 1, 60, reply);
    expect(result.limited).toBe(true);
    expect(result.retryAfter).toBe(1);
  });
});
