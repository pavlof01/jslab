import { describe, expect, it } from "vitest";
import { cacheKey } from "./cache.js";
import type { NormalizedRunRequest } from "./types.js";

const base: NormalizedRunRequest = {
  engine: "v8",
  sourceText: "console.log(1)",
  flags: ["--print-bytecode"],
  timeoutMs: 2000,
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

  it("buckets timeout to 100ms windows so near-equal timeouts share a key", () => {
    // ceil(2001/100) === ceil(2099/100) === 21 → same bucket, same key.
    expect(cacheKey({ ...base, timeoutMs: 2001 })).toBe(cacheKey({ ...base, timeoutMs: 2099 }));
    // ceil(2099/100)=21 vs ceil(2101/100)=22 → different bucket, different key.
    expect(cacheKey({ ...base, timeoutMs: 2099 })).not.toBe(cacheKey({ ...base, timeoutMs: 2101 }));
  });
});
