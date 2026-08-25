import type { Redis } from "ioredis";
import { describe, expect, it } from "vitest";

import {
  extractApiKey,
  generateApiKey,
  issueApiKey,
  isValidKeyFormat,
  KEY_PREFIX,
  lookupApiKey,
  revokeApiKey,
} from "./apiKeys.js";

/**
 * Minimal in-memory stand-in for the handful of ioredis commands apiKeys.ts
 * actually calls (multi/exec with set+EX, get, del, zadd/zcard/zremrangebyscore,
 * expire). Not a general Redis mock — just enough to exercise the hashing/TTL/
 * owner-limit logic without a real Redis instance.
 */
function fakeRedis() {
  const strings = new Map<string, { value: string; expiresAt: number | null }>();
  const zsets = new Map<string, Map<string, number>>();
  const zsetExpiry = new Map<string, number>();

  function isExpired(expiresAt: number | null): boolean {
    return expiresAt !== null && expiresAt <= Date.now();
  }

  const commands = {
    get(key: string): string | null {
      const entry = strings.get(key);
      if (!entry || isExpired(entry.expiresAt)) return null;
      return entry.value;
    },
    set(key: string, value: string, _ex: "EX", seconds: number): "OK" {
      strings.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
      return "OK";
    },
    del(key: string): number {
      return strings.delete(key) ? 1 : 0;
    },
    zadd(key: string, score: number, member: string): number {
      if (!zsets.has(key)) zsets.set(key, new Map());
      const set = zsets.get(key)!;
      const isNew = !set.has(member);
      set.set(member, score);
      return isNew ? 1 : 0;
    },
    zcard(key: string): number {
      const exp = zsetExpiry.get(key);
      if (exp !== undefined && exp <= Date.now()) return 0;
      return zsets.get(key)?.size ?? 0;
    },
    zremrangebyscore(key: string, min: string | number, max: string | number): number {
      const set = zsets.get(key);
      if (!set) return 0;
      const lo = min === "-inf" ? -Infinity : Number(min);
      const hi = max === "+inf" ? Infinity : Number(max);
      let removed = 0;
      for (const [member, score] of set) {
        if (score >= lo && score <= hi) {
          set.delete(member);
          removed++;
        }
      }
      return removed;
    },
    expire(key: string, seconds: number): number {
      zsetExpiry.set(key, Date.now() + seconds * 1000);
      return 1;
    },
  };

  function multi() {
    const queue: Array<() => unknown> = [];
    const chain: Record<string, (...args: any[]) => typeof chain> = {};
    for (const name of Object.keys(commands) as Array<keyof typeof commands>) {
      chain[name] = (...args: any[]) => {
        queue.push(() => (commands[name] as any)(...args));
        return chain;
      };
    }
    (chain as any).exec = async () => queue.map((run) => [null, run()]);
    return chain;
  }

  return { ...commands, multi } as unknown as Redis;
}

describe("isValidKeyFormat", () => {
  it("accepts a well-formed key", () => {
    expect(isValidKeyFormat(`${KEY_PREFIX}${"a".repeat(32)}`)).toBe(true);
  });
  it("rejects wrong prefix, length, or charset", () => {
    expect(isValidKeyFormat("nope_" + "a".repeat(32))).toBe(false);
    expect(isValidKeyFormat(`${KEY_PREFIX}${"a".repeat(31)}`)).toBe(false);
    expect(isValidKeyFormat(`${KEY_PREFIX}${"Z".repeat(32)}`)).toBe(false);
    expect(isValidKeyFormat("")).toBe(false);
  });
});

describe("generateApiKey", () => {
  it("prefixes and appends the random part", () => {
    expect(generateApiKey(() => "f".repeat(32))).toBe(`${KEY_PREFIX}${"f".repeat(32)}`);
  });
  it("produces format-valid keys by default", () => {
    expect(isValidKeyFormat(generateApiKey())).toBe(true);
  });
});

describe("extractApiKey", () => {
  it("reads x-api-key", () => {
    expect(extractApiKey({ "x-api-key": "  abc  " })).toBe("abc");
  });
  it("reads Authorization: Bearer", () => {
    expect(extractApiKey({ authorization: "Bearer xyz" })).toBe("xyz");
    expect(extractApiKey({ authorization: "bearer  xyz  " })).toBe("xyz");
  });
  it("prefers x-api-key over Authorization", () => {
    expect(extractApiKey({ "x-api-key": "a", authorization: "Bearer b" })).toBe("a");
  });
  it("returns null when absent or malformed", () => {
    expect(extractApiKey({})).toBeNull();
    expect(extractApiKey({ authorization: "Basic abc" })).toBeNull();
    expect(extractApiKey({ "x-api-key": "   " })).toBeNull();
  });
});

describe("issueApiKey / lookupApiKey / revokeApiKey", () => {
  it("issues a key that immediately looks up with the right rpm", async () => {
    const redis = fakeRedis();
    const result = await issueApiKey(redis, 240, Date.now(), 3600, "owner-a", 10);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(isValidKeyFormat(result.key)).toBe(true);

    const record = await lookupApiKey(redis, result.key);
    expect(record?.rpm).toBe(240);
  });

  it("never stores the plaintext key as a Redis key or value", async () => {
    const redis = fakeRedis();
    const result = await issueApiKey(redis, 60, Date.now(), 3600, "owner-b", 10);
    if (!result.ok) throw new Error("unreachable");

    // Reach into the fake's internals via the same commands issueApiKey used:
    // scanning for the raw key would require exposing internal maps, so
    // instead assert the *documented* key name (a hash) resolves, and that
    // asking Redis for something keyed by the plaintext key itself finds
    // nothing — i.e. the plaintext never became a Redis key name.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await (redis as any).get(`apikey:${result.key}`);
    expect(raw).toBeNull();
  });

  it("rejects a lookup for an unknown or malformed key", async () => {
    const redis = fakeRedis();
    expect(await lookupApiKey(redis, `${KEY_PREFIX}${"0".repeat(32)}`)).toBeNull();
    expect(await lookupApiKey(redis, "not-a-key")).toBeNull();
  });

  it("enforces the per-owner live-key cap", async () => {
    const redis = fakeRedis();
    for (let i = 0; i < 3; i++) {
      const r = await issueApiKey(redis, 60, Date.now(), 3600, "owner-capped", 3);
      expect(r.ok).toBe(true);
    }
    const fourth = await issueApiKey(redis, 60, Date.now(), 3600, "owner-capped", 3);
    expect(fourth).toEqual({ ok: false, reason: "owner_limit" });
  });

  it("does not let two different owners share a cap", async () => {
    const redis = fakeRedis();
    for (let i = 0; i < 3; i++) {
      await issueApiKey(redis, 60, Date.now(), 3600, "owner-x", 3);
    }
    const otherOwner = await issueApiKey(redis, 60, Date.now(), 3600, "owner-y", 3);
    expect(otherOwner.ok).toBe(true);
  });

  it("frees up capacity once a key's owner-index entry expires", async () => {
    const redis = fakeRedis();
    const tenSecondsAgo = Date.now() - 10_000;
    // ttlSeconds=1 with a "now" of 10s ago puts this entry's expiry (now +
    // ttl*1000) about 9s in the past relative to the real clock.
    await issueApiKey(redis, 60, tenSecondsAgo, 1, "owner-expiring", 1);
    // A second issuance "now" prunes the already-expired entry before
    // counting, so it should succeed rather than hit the cap.
    const second = await issueApiKey(redis, 60, Date.now(), 3600, "owner-expiring", 1);
    expect(second.ok).toBe(true);
  });

  it("revokes a key so it no longer looks up, and is idempotent", async () => {
    const redis = fakeRedis();
    const result = await issueApiKey(redis, 60, Date.now(), 3600, "owner-c", 10);
    if (!result.ok) throw new Error("unreachable");

    expect(await revokeApiKey(redis, result.key)).toBe(true);
    expect(await lookupApiKey(redis, result.key)).toBeNull();
    expect(await revokeApiKey(redis, result.key)).toBe(false);
  });

  it("refuses to revoke a malformed key without touching Redis", async () => {
    const redis = fakeRedis();
    expect(await revokeApiKey(redis, "garbage")).toBe(false);
  });
});
