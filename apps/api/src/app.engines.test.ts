import type { Redis } from "ioredis";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createFakeRedis } from "./test-support/fakeRedis.js";
import { mockUpstream, type MockUpstream } from "./test-support/mockUpstream.js";

const ORIGINS = {
  v8: "http://engine-v8:8080",
  hermes: "http://engine-hermes:8080",
  sm: "http://engine-sm:8080",
  jsc: "http://engine-jsc:8080",
};

function makeApp(redis = createFakeRedis()) {
  const saved = { ...process.env };
  Object.assign(process.env, {
    ENGINE_V8_URL: ORIGINS.v8,
    ENGINE_HERMES_URL: ORIGINS.hermes,
    ENGINE_SM_URL: ORIGINS.sm,
    ENGINE_JSC_URL: ORIGINS.jsc,
    REDIS_URL: "redis://localhost:6379",
    LOG_LEVEL: "silent",
  });
  const config = loadConfig();
  process.env = saved;
  return buildApp({ config, redis: redis.client as unknown as Redis });
}

function healthy(upstream: MockUpstream, versions: Record<string, string | null>, persist = false) {
  for (const [engine, origin] of Object.entries(ORIGINS)) {
    upstream.replyGet(origin, "/healthz", 200, { ok: true, engine, version: versions[engine] ?? null }, persist);
  }
}

const engines = (app: ReturnType<typeof buildApp>) => app.inject({ method: "GET", url: "/api/engines" });

let upstream: MockUpstream;
let open: ReturnType<typeof buildApp>[] = [];

beforeEach(() => {
  upstream = mockUpstream();
});

afterEach(async () => {
  await Promise.all(open.map((app) => app.close()));
  open = [];
  await upstream.restore();
});

describe("GET /api/engines", () => {
  it("reports the version each engine probed from its binary", async () => {
    healthy(upstream, { v8: "14.9.0 (candidate)", hermes: "1.0.0 (HBC 98)", sm: "134.0", jsc: null });
    const app = makeApp();
    open.push(app);

    const res = await engines(app);

    expect(res.statusCode).toBe(200);
    expect(res.json().engines).toEqual([
      { engine: "v8", ok: true, version: "14.9.0 (candidate)" },
      { engine: "hermes", ok: true, version: "1.0.0 (HBC 98)" },
      { engine: "sm", ok: true, version: "134.0" },
      { engine: "jsc", ok: true, version: null },
    ]);
  });

  it("keeps answering when one engine is unreachable", async () => {
    upstream.replyGet(ORIGINS.v8, "/healthz", 200, { ok: true, engine: "v8", version: "14.9.0" });
    upstream.replyGet(ORIGINS.hermes, "/healthz", 200, { ok: true, engine: "hermes", version: "1.0.0" });
    upstream.replyGet(ORIGINS.sm, "/healthz", 503, { ok: false });
    upstream.replyGet(ORIGINS.jsc, "/healthz", 200, { ok: true, engine: "jsc", version: null });
    const app = makeApp();
    open.push(app);

    const res = await engines(app);

    expect(res.statusCode).toBe(200);
    const byEngine = Object.fromEntries(res.json().engines.map((e: { engine: string }) => [e.engine, e]));
    expect(byEngine.sm).toEqual({ engine: "sm", ok: false, version: null });
    expect(byEngine.v8.version).toBe("14.9.0");
  });

  it("serves the second call from cache instead of re-probing", async () => {
    healthy(upstream, { v8: "14.9.0" }, true);
    const app = makeApp();
    open.push(app);

    const first = await engines(app);
    const second = await engines(app);

    expect(first.json().meta.cacheHit).toBe(false);
    expect(second.json().meta.cacheHit).toBe(true);
    expect(second.json().engines).toEqual(first.json().engines);
    expect(upstream.calls()).toHaveLength(4);
  });

  it("shares the cache between replicas instead of keeping it per process", async () => {
    healthy(upstream, { v8: "14.9.0" }, true);
    const redis = createFakeRedis();
    const first = makeApp(redis);
    const second = makeApp(redis);
    open.push(first, second);

    const cold = await engines(first);
    const warm = await engines(second);

    expect(cold.json().meta.cacheHit).toBe(false);
    expect(warm.json().meta.cacheHit).toBe(true);
    expect(upstream.calls()).toHaveLength(4);
  });

  it("does not cache a fan-out in which every engine failed", async () => {
    for (const origin of Object.values(ORIGINS)) upstream.replyGet(origin, "/healthz", 503, { ok: false });
    const redis = createFakeRedis();
    const app = makeApp(redis);
    open.push(app);

    const outage = await engines(app);
    expect(outage.json().engines.every((e: { ok: boolean }) => !e.ok)).toBe(true);

    healthy(upstream, { v8: "14.9.0" }, true);
    const recovered = await engines(app);
    expect(recovered.json().meta.cacheHit).toBe(false);
    expect(recovered.json().engines.every((e: { ok: boolean }) => e.ok)).toBe(true);
  });

  it("charges the request to a rate-limit bucket", async () => {
    healthy(upstream, { v8: "14.9.0" }, true);
    const redis = createFakeRedis();
    const app = makeApp(redis);
    open.push(app);

    await engines(app);

    const counters = redis.keys().filter((key) => key.startsWith("ratelimit:general:"));
    expect(counters.length, `no general-bucket counter among ${redis.keys().join(", ")}`).toBeGreaterThan(0);
  });
});
