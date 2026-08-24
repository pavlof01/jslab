import { Redis } from "ioredis";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { mockUpstream, type MockUpstream } from "./test-support/mockUpstream.js";

const REDIS_URL = process.env.TEST_REDIS_URL;
const describeRedis = REDIS_URL ? describe : describe.skip;

const ORIGIN = "http://engine-v8:8080";

describeRedis("gateway against a real Redis", () => {
  let redis: Redis;
  let upstream: MockUpstream;

  function makeApp(env: Record<string, string> = {}) {
    const saved = { ...process.env };
    Object.assign(process.env, { ENGINE_V8_URL: ORIGIN, REDIS_URL, LOG_LEVEL: "silent", ...env });
    const config = loadConfig();
    process.env = saved;
    return buildApp({ config, redis });
  }

  const run = (app: ReturnType<typeof buildApp>, body: Record<string, unknown>) =>
    app.inject({ method: "POST", url: "/api/run", payload: body, headers: { "content-type": "application/json" } });

  const okEngine = () =>
    upstream.reply(ORIGIN, "/run", 200, {
      ok: true,
      stdout: "Ldar a0",
      stderr: "",
      artifacts: [],
      meta: {},
    });

  beforeAll(() => {
    redis = new Redis(REDIS_URL as string, { maxRetriesPerRequest: 2, lazyConnect: false });
  });
  afterAll(async () => {
    await redis.quit();
  });
  let nodeEnv: string | undefined;
  beforeEach(async () => {
    await redis.flushall();
    upstream = mockUpstream();
    nodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
  });
  afterEach(async () => {
    process.env.NODE_ENV = nodeEnv;
    await upstream.restore();
  });

  it("serves the second identical run from Redis, not a second engine spawn", async () => {
    okEngine();
    okEngine(); // a second interceptor is available if coalescing somehow misses
    const app = makeApp();

    const first = await run(app, { engine: "v8", sourceText: "1+1" });
    const second = await run(app, { engine: "v8", sourceText: "1+1" });

    expect(first.json().meta.cacheHit).toBe(false);
    expect(second.json().meta.cacheHit).toBe(true);
    expect(upstream.calls().filter((c) => c.path === "/run")).toHaveLength(1);

    await app.close();
  });

  it("lets a positive cache entry expire on the real clock", async () => {
    okEngine();
    okEngine();
    const app = makeApp({ CACHE_TTL_SECONDS: "1" });

    await run(app, { engine: "v8", sourceText: "1+1" });
    expect((await run(app, { engine: "v8", sourceText: "1+1" })).json().meta.cacheHit).toBe(true);

    await new Promise((r) => setTimeout(r, 1200));

    const afterExpiry = await run(app, { engine: "v8", sourceText: "1+1" });
    expect(afterExpiry.json().meta.cacheHit).toBe(false);

    await app.close();
  });

  it("caches a deterministic 400 under the shorter negative TTL", async () => {
    upstream.reply(ORIGIN, "/run", 400, { ok: false, error: "bad flags" });
    const app = makeApp();

    const res = await run(app, { engine: "v8", sourceText: "1+1" });
    expect(res.statusCode).toBe(400);

    const keys = await redis.keys("api-cache:*");
    expect(keys.length).toBeGreaterThan(0);
    const ttl = await redis.ttl(keys[0]);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(30);

    await app.close();
  });

  it("shares one rate-limit window across concurrent requests instead of losing INCRs", async () => {
    for (let i = 0; i < 6; i++) okEngine();
    const app = makeApp({ RATE_LIMIT_HEAVY_PER_MIN: "3" });

    const results = await Promise.all(
      [1, 2, 3, 4, 5].map((n) => run(app, { engine: "v8", sourceText: `${n}+${n}` })),
    );
    const statuses = results.map((r) => r.statusCode).sort();
    expect(statuses.filter((s) => s === 200)).toHaveLength(3);
    expect(statuses.filter((s) => s === 429)).toHaveLength(2);

    await app.close();
  });

  it("increments the cache metric series that /metrics exposes", async () => {
    okEngine();
    okEngine();
    const app = makeApp();

    await run(app, { engine: "v8", sourceText: "1+1" }); // miss
    await run(app, { engine: "v8", sourceText: "1+1" }); // hit

    const metrics = await app.inject({ method: "GET", url: "/metrics" });
    expect(metrics.statusCode).toBe(200);
    expect(metrics.body).toContain("jslab_api_cache_events_total");
    expect(metrics.body).toMatch(/jslab_api_cache_events_total\{result="hit"\}\s+[1-9]/);
    expect(metrics.body).toMatch(/jslab_api_cache_events_total\{result="miss"\}\s+[1-9]/);

    await app.close();
  });
});
