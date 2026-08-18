import type { Redis } from "ioredis";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app.js";
import { cacheKey } from "./cache.js";
import { loadConfig, type ApiConfig } from "./config.js";
import type { ApiResponse } from "./types.js";

/**
 * Route-level tests for the gateway.
 *
 * These exist because `buildApp` takes its config and its Redis client as
 * arguments: nothing is read from the environment or dialled at import time, so
 * the whole request pipeline — validation, authentication, the layered rate
 * limits, the cache, the upstream call — can be driven with `app.inject()`.
 */

/** Enough of ioredis for the paths under test; unused commands stay unimplemented. */
class FakeRedis {
  status = "ready";
  readonly store = new Map<string, string>();
  readonly counters = new Map<string, number>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setex(key: string, _ttl: number, value: string): Promise<"OK"> {
    this.store.set(key, value);
    return "OK";
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  multi() {
    const replies: Array<() => [null, unknown]> = [];
    const chain = {
      incr: (key: string) => {
        replies.push(() => [null, this.counters.set(key, (this.counters.get(key) ?? 0) + 1).get(key)]);
        return chain;
      },
      expire: () => {
        replies.push(() => [null, 1]);
        return chain;
      },
      ttl: () => {
        replies.push(() => [null, 60]);
        return chain;
      },
      exec: async () => replies.map((reply) => reply()),
    };
    return chain;
  }
}

// An address nothing listens on: any request that reaches the upstream fails
// fast with ECONNREFUSED, which is exactly what the "no engine" assertions want.
const DEAD_UPSTREAM = "http://127.0.0.1:1";

function makeApp(overrides: Partial<ApiConfig> = {}) {
  const redis = new FakeRedis();
  const config: ApiConfig = {
    ...loadConfig(),
    LOG_LEVEL: "silent",
    ENGINE_V8_URL: DEAD_UPSTREAM,
    TRACE_SERVICE_URL: DEAD_UPSTREAM,
    ...overrides,
  };
  const app = buildApp({ config, redis: redis as unknown as Redis });
  return { app, redis, config };
}

const post = (app: ReturnType<typeof makeApp>["app"], url: string, payload: unknown, headers: Record<string, string> = {}) =>
  app.inject({ method: "POST", url, payload: payload as object, headers: { "content-type": "application/json", ...headers } });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("gateway routes", () => {
  it("reports Redis state on /healthz", async () => {
    const { app } = makeApp();
    expect((await app.inject({ method: "GET", url: "/healthz" })).json()).toEqual({ ok: true, redis: "ready" });
  });

  it("documents every engine in the catalog on /api/flags", async () => {
    const { app } = makeApp();
    const body = (await app.inject({ method: "GET", url: "/api/flags" })).json();
    expect(Object.keys(body.engines)).toEqual(["v8", "hermes", "sm", "jsc"]);
    expect(body.engines.v8.some((spec: { flag: string }) => spec.flag === "--print-bytecode")).toBe(true);
  });

  it("rejects a malformed run request with the offending field", async () => {
    const { app } = makeApp();
    const res = await post(app, "/api/run", { engine: "nope", sourceText: "1;" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/^engine:/);
  });

  it("rejects a source longer than the configured limit", async () => {
    const { app } = makeApp({ MAX_SOURCE_LENGTH: 10 });
    const res = await post(app, "/api/run", { engine: "v8", sourceText: "x".repeat(11) });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain("exceeds limit");
  });

  it("answers 429 with a Retry-After once the general budget is spent", async () => {
    const { app } = makeApp({ RATE_LIMIT_PER_MIN: 0 });
    const res = await post(app, "/api/run", { engine: "v8", sourceText: "1;" });
    expect(res.statusCode).toBe(429);
    expect(res.headers["retry-after"]).toBeDefined();
    expect(res.json().meta.retryAfter).toBeGreaterThan(0);
  });

  it("answers 401 for a key that is not on file", async () => {
    const { app } = makeApp();
    const res = await post(app, "/api/run", { engine: "v8", sourceText: "1;" }, { "x-api-key": `jslab_${"a".repeat(32)}` });
    expect(res.statusCode).toBe(401);
  });

  it("serves a cached run without calling the engine at all", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { app, redis, config } = makeApp();

    const cached: ApiResponse = {
      ok: true,
      stdout: "cached output",
      stderr: "",
      artifacts: [],
      meta: { durationMs: 7, engine: "v8", cacheHit: false },
    };
    const key = cacheKey({
      engine: "v8",
      sourceText: "1;",
      flags: [],
      timeoutMs: config.DEFAULT_TIMEOUT_MS,
      droppedFlags: [],
    });
    redis.store.set(key, JSON.stringify({ status: 200, body: cached }));

    const res = await post(app, "/api/run", { engine: "v8", sourceText: "1;" });
    expect(res.statusCode).toBe(200);
    // Reaching the (dead) engine would have produced a 502, so a 200 here is
    // itself the proof that the cache short-circuited the run.
    expect(res.json().stdout).toBe("cached output");
    expect(res.json().meta.cacheHit).toBe(true);
  });

  it("turns an unreachable engine into a 502, not a crash", async () => {
    const { app } = makeApp();
    const res = await post(app, "/api/run", { engine: "v8", sourceText: "1;" });
    expect(res.statusCode).toBe(502);
    expect(res.json().error).toContain("engine");
  });

  it("reports rejected flags on a cache hit, without them changing the cache key", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { app, redis, config } = makeApp();

    // The key is built from the flags that survived the allowlist, so a request
    // carrying junk flags on top must still hit the same entry.
    const key = cacheKey({
      engine: "v8",
      sourceText: "1;",
      flags: ["--print-bytecode"],
      timeoutMs: config.DEFAULT_TIMEOUT_MS,
      droppedFlags: [],
    });
    const cached: ApiResponse = {
      ok: true,
      stdout: "out",
      stderr: "",
      artifacts: [],
      meta: { durationMs: 1, engine: "v8", cacheHit: false },
    };
    redis.store.set(key, JSON.stringify({ status: 200, body: cached }));

    const res = await post(app, "/api/run", {
      engine: "v8",
      sourceText: "1;",
      options: { flags: ["--print-bytecode", "--not-a-real-flag"] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().meta.droppedFlags).toEqual(["--not-a-real-flag"]);
  });

  it("validates the trace body before spending any budget", async () => {
    const { app } = makeApp();
    const res = await post(app, "/api/trace/execute/equality", { input: "" });
    expect(res.statusCode).toBe(400);
  });

  it("requires a JSON content type to mint a key", async () => {
    const { app } = makeApp();
    const res = await app.inject({ method: "POST", url: "/api/keys", headers: { "content-type": "text/plain" } });
    expect(res.statusCode).toBe(415);
  });

  it("counts key issuance against its own hourly bucket", async () => {
    const { app } = makeApp({ API_KEY_ISSUE_PER_HOUR: 0 });
    const res = await post(app, "/api/keys", {});
    expect(res.statusCode).toBe(429);
    expect(res.json().error).toBe("key issuance limit reached");
  });

  it("refuses to revoke when no key is presented", async () => {
    const { app } = makeApp();
    const res = await app.inject({ method: "DELETE", url: "/api/keys" });
    expect(res.statusCode).toBe(400);
  });
});
