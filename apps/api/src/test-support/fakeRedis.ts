import type { Redis } from "ioredis";

/**
 * In-memory stand-in for the handful of ioredis commands the gateway actually
 * issues: strings with TTLs (response cache, api-key records), counters
 * (rate limiter), and sorted sets (per-owner key index). Enough to drive the
 * real route handlers end-to-end without a Redis server; not a general mock.
 *
 * `failCommands` makes every command throw, which is how the fail-open paths
 * (rate limiter, cache read/write) get exercised.
 */
export interface FakeRedis {
  client: Redis;
  strings: Map<string, { value: string; expiresAt: number | null }>;
  /** Set true to make every subsequent command reject. */
  failCommands: boolean;
  /** Every command name issued, in order — lets tests assert on Redis traffic. */
  calls: string[];
  /** Force a key's counter, e.g. to push a rate-limit bucket over its limit. */
  seedCounter(key: string, value: number): void;
  /** Redis key names currently holding a value. */
  keys(): string[];
}

export function createFakeRedis(): FakeRedis {
  const strings = new Map<string, { value: string; expiresAt: number | null }>();
  const ttls = new Map<string, number>();
  const zsets = new Map<string, Map<string, number>>();

  const state = {
    failCommands: false,
    calls: [] as string[],
  };

  function expired(key: string): boolean {
    const entry = strings.get(key);
    if (!entry) return false;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      strings.delete(key);
      ttls.delete(key);
      return true;
    }
    return false;
  }

  function guard(name: string): void {
    state.calls.push(name);
    if (state.failCommands) throw new Error(`fake redis: ${name} failed`);
  }

  const ops = {
    get(key: string): string | null {
      guard("get");
      if (expired(key)) return null;
      return strings.get(key)?.value ?? null;
    },
    set(key: string, value: string, mode?: string, seconds?: number): "OK" {
      guard("set");
      const ttl = mode?.toUpperCase() === "EX" && typeof seconds === "number" ? seconds : null;
      strings.set(key, { value, expiresAt: ttl === null ? null : Date.now() + ttl * 1000 });
      if (ttl !== null) ttls.set(key, ttl);
      return "OK";
    },
    setex(key: string, seconds: number, value: string): "OK" {
      guard("setex");
      strings.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
      ttls.set(key, seconds);
      return "OK";
    },
    del(key: string): number {
      guard("del");
      expired(key);
      const had = strings.delete(key);
      ttls.delete(key);
      return had ? 1 : 0;
    },
    incr(key: string): number {
      guard("incr");
      expired(key);
      const next = Number(strings.get(key)?.value ?? 0) + 1;
      const existing = strings.get(key);
      strings.set(key, { value: String(next), expiresAt: existing?.expiresAt ?? null });
      return next;
    },
    expire(key: string, seconds: number, mode?: string): number {
      guard("expire");
      const entry = strings.get(key);
      if (!entry) return 0;
      // "NX": only set a TTL when the key has none yet.
      if (mode?.toUpperCase() === "NX" && entry.expiresAt !== null) return 0;
      entry.expiresAt = Date.now() + seconds * 1000;
      ttls.set(key, seconds);
      return 1;
    },
    ttl(key: string): number {
      guard("ttl");
      if (!strings.has(key)) return -2;
      return ttls.get(key) ?? -1;
    },
    zadd(key: string, score: number, member: string): number {
      guard("zadd");
      const set = zsets.get(key) ?? new Map<string, number>();
      const isNew = !set.has(member);
      set.set(member, score);
      zsets.set(key, set);
      return isNew ? 1 : 0;
    },
    zcard(key: string): number {
      guard("zcard");
      return zsets.get(key)?.size ?? 0;
    },
    zremrangebyscore(key: string, _min: string | number, max: string | number): number {
      guard("zremrangebyscore");
      const set = zsets.get(key);
      if (!set) return 0;
      const ceiling = typeof max === "number" ? max : Number(max);
      let removed = 0;
      for (const [member, score] of set) {
        if (score <= ceiling) {
          set.delete(member);
          removed++;
        }
      }
      return removed;
    },
  };

  type MultiEntry = { run: () => unknown };

  function multi() {
    const queued: MultiEntry[] = [];
    const chain: Record<string, (...args: any[]) => unknown> = {
      // ioredis rejects the whole exec() when the connection itself is broken,
      // rather than reporting a per-command error, so `failCommands` does too.
      exec: async () => {
        if (state.failCommands) throw new Error("fake redis: exec failed");
        return queued.map((entry) => {
          try {
            return [null, entry.run()];
          } catch (err) {
            return [err as Error, undefined];
          }
        });
      },
    };
    for (const [name, fn] of Object.entries(ops)) {
      chain[name] = (...args: any[]) => {
        queued.push({ run: () => (fn as (...a: any[]) => unknown)(...args) });
        return chain;
      };
    }
    return chain;
  }

  const client: Record<string, unknown> = { status: "ready", multi };
  for (const [name, fn] of Object.entries(ops)) {
    client[name] = async (...args: any[]) => (fn as (...a: any[]) => unknown)(...args);
  }

  return {
    client: client as unknown as Redis,
    strings,
    get failCommands() {
      return state.failCommands;
    },
    set failCommands(value: boolean) {
      state.failCommands = value;
    },
    get calls() {
      return state.calls;
    },
    seedCounter(key: string, value: number) {
      strings.set(key, { value: String(value), expiresAt: Date.now() + 60_000 });
      ttls.set(key, 60);
    },
    keys() {
      return [...strings.keys()];
    },
  };
}
