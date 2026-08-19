import { describe, expect, it, vi } from "vitest";
import { type CachedResult, cacheKey, MAX_CACHE_VALUE_BYTES, writeCache } from "./cache.js";
import type { NormalizedRunRequest } from "./types.js";

const base: NormalizedRunRequest = {
  engine: "v8",
  sourceText: "console.log(1)",
  flags: ["--print-bytecode"],
  timeoutMs: 2000,
  droppedFlags: [],
};

describe("cacheKey", () => {
  it("is deterministic for identical input", () => {
    expect(cacheKey(base)).toBe(cacheKey({ ...base }));
  });

  it("is prefixed for namespacing", () => {
    expect(cacheKey(base)).toMatch(/^api-cache:[0-9a-f]{64}$/);
  });

  it("differs on engine, source, and flags", () => {
    expect(cacheKey(base)).not.toBe(cacheKey({ ...base, engine: "hermes" }));
    expect(cacheKey(base)).not.toBe(cacheKey({ ...base, sourceText: "console.log(2)" }));
    expect(cacheKey(base)).not.toBe(cacheKey({ ...base, flags: [] }));
  });

  it("ignores dropped flags: they change nothing about the run", () => {
    expect(cacheKey(base)).toBe(cacheKey({ ...base, droppedFlags: ["--typo"] }));
  });

  it("buckets timeout to 100ms windows so near-equal timeouts share a key", () => {
    // ceil(2001/100) === ceil(2099/100) === 21 → same bucket, same key.
    expect(cacheKey({ ...base, timeoutMs: 2001 })).toBe(cacheKey({ ...base, timeoutMs: 2099 }));
    // ceil(2099/100)=21 vs ceil(2101/100)=22 → different bucket, different key.
    expect(cacheKey({ ...base, timeoutMs: 2099 })).not.toBe(cacheKey({ ...base, timeoutMs: 2101 }));
  });
});

describe("writeCache size guard", () => {
  function result(stdoutBytes: number): CachedResult {
    return {
      status: 200,
      body: {
        ok: true,
        stdout: "x".repeat(stdoutBytes),
        stderr: "",
        artifacts: [],
        meta: { durationMs: 1, engine: "v8", cacheHit: false },
      },
    };
  }

  function fakeRedis() {
    return { setex: vi.fn().mockResolvedValue("OK") } as any;
  }

  it("stores a body that fits under the cap", async () => {
    const redis = fakeRedis();
    await writeCache(redis, "api-cache:k", result(1024), 600);
    expect(redis.setex).toHaveBeenCalledTimes(1);
    expect(redis.setex.mock.calls[0][1]).toBe(600);
  });

  it("refuses to store a body over the cap", async () => {
    // Redis holds the rate limiter's counters too, under allkeys-lru at 200mb.
    // Caching multi-megabyte engine output evicts those counters, which turns
    // heavy abuse into a way of switching the rate limiter off.
    const redis = fakeRedis();
    const log = { warn: vi.fn() } as any;
    await writeCache(redis, "api-cache:k", result(MAX_CACHE_VALUE_BYTES + 1), 600, log);
    expect(redis.setex).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalled();
  });

  it("keeps the cap well under Redis's shared memory budget", () => {
    expect(MAX_CACHE_VALUE_BYTES).toBeLessThanOrEqual(512 * 1024);
  });

  it("swallows a Redis failure instead of failing the request", async () => {
    const redis = { setex: vi.fn().mockRejectedValue(new Error("nope")) } as any;
    const log = { warn: vi.fn() } as any;
    await expect(writeCache(redis, "api-cache:k", result(16), 600, log)).resolves.toBeUndefined();
    expect(log.warn).toHaveBeenCalled();
  });
});
