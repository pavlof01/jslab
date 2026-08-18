import { describe, expect, it } from "vitest";
import { checkHealth, runOnEngine } from "./client.js";

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });

describe("runOnEngine", () => {
  it("posts the normalized run request and reports the engine's answer", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = (async (url: any, init: any) => {
      calls.push({ url: String(url), init });
      return jsonResponse({
        ok: true,
        stdout: "bytecode",
        stderr: "",
        artifacts: [],
        meta: { durationMs: 42, engine: "v8", cacheHit: true },
      });
    }) as unknown as typeof fetch;

    const outcome = await runOnEngine("v8", "1 + 1", ["--print-bytecode"], {
      apiUrl: "http://gateway.test",
      apiKey: "jslab_key",
      timeoutMs: 3000,
      fetchImpl,
      now: () => 0,
    });

    expect(calls[0].url).toBe("http://gateway.test/api/run");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      engine: "v8",
      sourceText: "1 + 1",
      options: { flags: ["--print-bytecode"], timeoutMs: 3000 },
    });
    expect((calls[0].init.headers as Record<string, string>)["x-api-key"]).toBe("jslab_key");
    expect(outcome).toMatchObject({ ok: true, stdout: "bytecode", durationMs: 42, cacheHit: true });
  });

  it("omits the api key header when no key is configured", async () => {
    let headers: Record<string, string> = {};
    const fetchImpl = (async (_url: any, init: any) => {
      headers = init.headers;
      return jsonResponse({ ok: true, stdout: "", stderr: "", artifacts: [], meta: {} });
    }) as unknown as typeof fetch;

    await runOnEngine("jsc", "1", [], { apiUrl: "http://gateway.test", fetchImpl });
    expect(headers["x-api-key"]).toBeUndefined();
  });

  it("turns an error payload into a failure, keeping retry-after", async () => {
    const fetchImpl = (async () =>
      jsonResponse(
        { ok: false, error: "rate limit exceeded", meta: { retryAfter: 7 } },
        { status: 429, headers: { "retry-after": "7" } },
      )) as unknown as typeof fetch;

    const outcome = await runOnEngine("v8", "1", [], { apiUrl: "http://gateway.test", fetchImpl });
    expect(outcome.ok).toBe(false);
    expect(outcome.failure).toEqual({ status: 429, message: "rate limit exceeded", retryAfterSeconds: 7 });
  });

  it("reports an unreachable gateway instead of throwing", async () => {
    const fetchImpl = (async () => {
      throw new Error("connect ECONNREFUSED");
    }) as unknown as typeof fetch;

    const outcome = await runOnEngine("sm", "1", [], { apiUrl: "http://localhost:8080", fetchImpl });
    expect(outcome.ok).toBe(false);
    expect(outcome.failure?.status).toBeNull();
    expect(outcome.failure?.message).toMatch(/cannot reach http:\/\/localhost:8080/);
  });

  it("survives a non-JSON body from a proxy in front of the gateway", async () => {
    const fetchImpl = (async () =>
      new Response("<html>502 Bad Gateway</html>", { status: 502 })) as unknown as typeof fetch;

    const outcome = await runOnEngine("hermes", "1", [], { apiUrl: "http://gateway.test", fetchImpl });
    expect(outcome.failure).toMatchObject({ status: 502, message: "HTTP 502" });
  });
});

describe("checkHealth", () => {
  it("reports a healthy gateway", async () => {
    const fetchImpl = (async () => jsonResponse({ ok: true, redis: "ready" })) as unknown as typeof fetch;
    expect(await checkHealth("http://gateway.test", fetchImpl)).toMatchObject({ ok: true, status: 200 });
  });

  it("treats a missing /healthz as reachable, not broken", async () => {
    const fetchImpl = (async () => new Response("not found", { status: 404 })) as unknown as typeof fetch;
    const health = await checkHealth("https://jslab.su", fetchImpl);
    expect(health.ok).toBe(true);
    expect(health.detail).toMatch(/reachable/);
  });

  it("reports an unhealthy gateway", async () => {
    const fetchImpl = (async () => jsonResponse({ ok: false }, { status: 503 })) as unknown as typeof fetch;
    expect(await checkHealth("http://gateway.test", fetchImpl)).toMatchObject({ ok: false, status: 503 });
  });
});
