import type { Redis } from "ioredis";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createFakeRedis, type FakeRedis } from "./test-support/fakeRedis.js";
import { mockUpstream, type MockUpstream } from "./test-support/mockUpstream.js";

/**
 * What the gateway does with an engine's answer: which status it maps to, what
 * it stamps on the body, and what it refuses to buffer. `app.test.ts` covers the
 * paths that never reach an engine; these need one on the other end, so undici's
 * dispatcher is swapped for a mock and the production request path is untouched.
 */

const ORIGIN = "http://engine-v8:8080";

/** `loadConfig` reads the environment, so the environment is what a test sets. */
function makeApp(env: Record<string, string> = {}) {
  const saved = { ...process.env };
  Object.assign(process.env, { ENGINE_V8_URL: ORIGIN, REDIS_URL: "redis://localhost:6379", LOG_LEVEL: "silent", ...env });
  const redis = createFakeRedis();
  const config = loadConfig();
  process.env = saved;

  const app = buildApp({ config, redis: redis.client as unknown as Redis });
  return { app, redis, config };
}

const run = (app: ReturnType<typeof buildApp>, body: Record<string, unknown> = {}) =>
  app.inject({
    method: "POST",
    url: "/api/run",
    payload: { engine: "v8", sourceText: "1+1", ...body },
  });

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

describe("proxying a run to its engine", () => {
  it("forwards the normalized payload to the engine that was asked for", async () => {
    const { app } = makeApp();
    open.push(app);
    upstream.reply(ORIGIN, "/run", 200, { ok: true, stdout: "2", stderr: "", artifacts: [] });

    await run(app, { options: { flags: ["--print-bytecode"], timeoutMs: 1234 } });

    const [call] = upstream.calls();
    expect(call.origin).toBe(ORIGIN);
    expect(JSON.parse(call.body)).toEqual({
      sourceText: "1+1",
      options: { flags: ["--print-bytecode"], timeoutMs: 1234 },
    });
  });

  it("stamps its own meta onto a successful engine response", async () => {
    const { app } = makeApp();
    open.push(app);
    upstream.reply(ORIGIN, "/run", 200, { ok: true, stdout: "2", stderr: "", artifacts: [] });

    const body = (await run(app)).json();

    expect(body.stdout).toBe("2");
    expect(body.meta.engine).toBe("v8");
    expect(body.meta.cacheHit).toBe(false);
    expect(typeof body.meta.durationMs).toBe("number");
  });

  it("carries the heavy budget's X-RateLimit-* headers on a run that actually spawns an engine", async () => {
    const { app, config } = makeApp();
    open.push(app);
    upstream.reply(ORIGIN, "/run", 200, { ok: true, stdout: "2", stderr: "", artifacts: [] });

    const res = await run(app);

    expect(res.statusCode).toBe(200);
    // Spawning an engine spends the heavy budget after the general one, so
    // its headers are the ones left on the reply — not the general bucket's.
    expect(res.headers["x-ratelimit-bucket"]).toBe("heavy");
    expect(res.headers["x-ratelimit-limit"]).toBe(String(config.RATE_LIMIT_HEAVY_PER_MIN));
    expect(res.headers["x-ratelimit-remaining"]).toBe(String(config.RATE_LIMIT_HEAVY_PER_MIN - 1));
  });

  it("reports the same heavy-budget numbers on a successful run and the 429 that follows once it is exhausted", async () => {
    const { app } = makeApp({ RATE_LIMIT_HEAVY_PER_MIN: "1" });
    open.push(app);
    upstream.reply(ORIGIN, "/run", 200, { ok: true, stdout: "2", stderr: "", artifacts: [] });

    const ok = await run(app);
    expect(ok.statusCode).toBe(200);
    expect(ok.headers["x-ratelimit-bucket"]).toBe("heavy");
    expect(ok.headers["x-ratelimit-remaining"]).toBe("0");

    const limited = await run(app, { sourceText: "2+2" }); // different source: cache miss again, spends heavy again
    expect(limited.statusCode).toBe(429);
    expect(limited.headers["x-ratelimit-bucket"]).toBe("heavy");
    expect(limited.headers["x-ratelimit-limit"]).toBe("1");
    expect(limited.headers["x-ratelimit-remaining"]).toBe("0");
  });

  it("passes an engine 429 through with its Retry-After", async () => {
    const { app } = makeApp();
    open.push(app);
    upstream.reply(ORIGIN, "/run", 429, { ok: false, error: "busy" }, { "retry-after": "7" });

    const res = await run(app);

    expect(res.statusCode).toBe(429);
    expect(res.headers["retry-after"]).toBe("7");
  });

  it("maps an engine 5xx to 502", async () => {
    const { app } = makeApp();
    open.push(app);
    upstream.reply(ORIGIN, "/run", 500, { ok: false, error: "boom" });

    expect((await run(app)).statusCode).toBe(502);
  });

  it("maps an engine-reported timeout to 504", async () => {
    const { app } = makeApp();
    open.push(app);
    upstream.reply(ORIGIN, "/run", 408, { ok: false, error: "timed out" });

    expect((await run(app)).statusCode).toBe(504);
  });

  it("passes an engine 400 through as a 400", async () => {
    const { app } = makeApp();
    open.push(app);
    upstream.reply(ORIGIN, "/run", 400, { ok: false, error: "bad flags" });

    expect((await run(app)).statusCode).toBe(400);
  });

  it("turns a body that is not JSON into a 502", async () => {
    const { app } = makeApp();
    open.push(app);
    upstream.reply(ORIGIN, "/run", 200, "<html>gateway</html>", { "content-type": "text/html" });

    expect((await run(app)).statusCode).toBe(502);
  });

});

/*
 * The run route reads and writes the cache only outside development
 * (`NODE_ENV !== "production"` disables it), so these tests say which mode they
 * are in rather than inheriting the runner's.
 */
describe("caching a proxied run", () => {
  const nodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = "production";
  });

  afterEach(() => {
    process.env.NODE_ENV = nodeEnv;
  });

  it("serves a second identical run without touching the engine", async () => {
    const { app } = makeApp();
    open.push(app);
    upstream.reply(ORIGIN, "/run", 200, { ok: true, stdout: "2", stderr: "", artifacts: [] });

    const first = (await run(app)).json();
    const second = (await run(app)).json();

    expect(first.meta.cacheHit).toBe(false);
    expect(second.meta.cacheHit).toBe(true);
    expect(second.stdout).toBe("2");
    expect(upstream.calls()).toHaveLength(1);
  });

  it("buckets the timeout into the cache key, so near-identical timeouts still hit", async () => {
    const { app } = makeApp();
    open.push(app);
    upstream.reply(ORIGIN, "/run", 200, { ok: true, stdout: "2", stderr: "", artifacts: [] });

    // Both ceil to bucket 11, which is what makes them one cache key.
    await run(app, { options: { timeoutMs: 1001 } });
    const second = (await run(app, { options: { timeoutMs: 1100 } })).json();

    expect(second.meta.cacheHit).toBe(true);
    expect(upstream.calls()).toHaveLength(1);
  });

  it("does not cache a transport failure", async () => {
    const { app } = makeApp();
    open.push(app);
    upstream.refuse(ORIGIN, "/run");
    upstream.refuse(ORIGIN, "/run");

    await run(app);
    await run(app);

    // A refusal never reaches the reply, so the count comes from the
    // interceptors: both were consumed, so both runs went to the engine.
    upstream.assertAllUsed();
  });
});
