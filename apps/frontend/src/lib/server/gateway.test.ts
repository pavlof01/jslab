/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { forwardedHeaders, gatewayUrl, proxyToGateway, readJsonBody, PROXY_TIMEOUT_MS } from "./gateway";

/**
 * The Next server helpers every /api route is built from. Tests run in the
 * node environment because they use the real Request/Response globals that
 * `next/server` builds on.
 */

const originalFetch = global.fetch;
const savedEnv = { ...process.env };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  delete process.env.JSLAB_BACKEND_URL;
  delete process.env.JSLAB_TRACE_BACKEND_URL;
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  global.fetch = originalFetch;
  process.env = { ...savedEnv };
  jest.restoreAllMocks();
});

describe("gatewayUrl", () => {
  it("falls back to the local dev gateway when nothing is configured", () => {
    expect(gatewayUrl()).toBe("http://localhost:8080");
    expect(gatewayUrl("trace")).toBe("http://localhost:8080");
  });

  it("uses the configured backend and drops a trailing slash", () => {
    process.env.JSLAB_BACKEND_URL = "http://api:8080/";
    expect(gatewayUrl()).toBe("http://api:8080");
  });

  it("lets trace traffic point at its own backend", () => {
    process.env.JSLAB_BACKEND_URL = "http://api:8080";
    process.env.JSLAB_TRACE_BACKEND_URL = "http://trace-api:8080";
    expect(gatewayUrl("run")).toBe("http://api:8080");
    expect(gatewayUrl("trace")).toBe("http://trace-api:8080");
  });

  it("falls back to the general backend when no trace backend is set", () => {
    process.env.JSLAB_BACKEND_URL = "http://api:8080";
    expect(gatewayUrl("trace")).toBe("http://api:8080");
  });
});

describe("forwardedHeaders", () => {
  it("always asks the gateway for JSON", () => {
    const headers = forwardedHeaders(new Request("http://localhost/api/run")) as Record<string, string>;
    expect(headers["content-type"]).toBe("application/json");
  });

  it("passes the caller's identity through so the gateway can rate-limit them", () => {
    const req = new Request("http://localhost/api/run", {
      headers: { "x-forwarded-for": "1.1.1.1", "cf-connecting-ip": "2.2.2.2", "x-api-key": "jslab_abc" },
    });
    expect(forwardedHeaders(req)).toEqual({
      "content-type": "application/json",
      "x-forwarded-for": "1.1.1.1",
      "cf-connecting-ip": "2.2.2.2",
      "x-api-key": "jslab_abc",
    });
  });

  it("omits identity headers the caller did not send rather than forwarding empties", () => {
    const headers = forwardedHeaders(new Request("http://localhost/api/run"));
    expect(headers).toEqual({ "content-type": "application/json" });
  });

  it("does not forward cookies or authorization headers", () => {
    const req = new Request("http://localhost/api/run", {
      headers: { cookie: "session=secret", authorization: "Bearer secret" },
    });
    expect(Object.keys(forwardedHeaders(req))).toEqual(["content-type"]);
  });
});

describe("readJsonBody", () => {
  it("parses a JSON body", async () => {
    const req = new Request("http://localhost/api/run", { method: "POST", body: JSON.stringify({ a: 1 }) });
    expect(await readJsonBody(req)).toEqual({ body: { a: 1 } });
  });

  it("turns malformed JSON into a 400 rather than throwing into the route", async () => {
    const req = new Request("http://localhost/api/run", { method: "POST", body: "{not json" });
    const result = await readJsonBody(req);
    if (!("error" in result)) throw new Error("expected an error response");
    expect(result.error.status).toBe(400);
    expect(await result.error.json()).toEqual({ error: "Invalid JSON body" });
  });
});

describe("proxyToGateway", () => {
  it("forwards the request and relays the gateway's status and body", async () => {
    const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => jsonResponse(200, { ok: true, stdout: "42" }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await proxyToGateway("/api/run", {
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ engine: "v8" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, stdout: "42" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8080/api/run");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ engine: "v8" }));
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("relays an error status from the gateway untouched", async () => {
    global.fetch = jest.fn(async () => jsonResponse(429, { error: "rate limit exceeded" })) as unknown as typeof fetch;
    const res = await proxyToGateway("/api/run", { headers: {}, body: "{}" });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "rate limit exceeded" });
  });

  it("routes trace traffic to the trace backend", async () => {
    process.env.JSLAB_TRACE_BACKEND_URL = "http://trace-api:8080";
    const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => jsonResponse(200, {}));
    global.fetch = fetchMock as unknown as typeof fetch;

    await proxyToGateway("/api/trace/execute/equality", { kind: "trace", headers: {}, body: "{}" });
    expect(fetchMock.mock.calls[0][0]).toBe("http://trace-api:8080/api/trace/execute/equality");
  });

  it("reports an unreachable gateway as a 503 the UI can explain", async () => {
    global.fetch = jest.fn(async () => {
      throw new Error("connect ECONNREFUSED");
    }) as unknown as typeof fetch;

    const res = await proxyToGateway("/api/run", { headers: {}, body: "{}" });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "The engine service is unavailable. Try again in a moment." });
  });

  it("reports an unreadable gateway response as a 502", async () => {
    global.fetch = jest.fn(async () => new Response("<html>502</html>", { status: 200 })) as unknown as typeof fetch;
    const res = await proxyToGateway("/api/run", { headers: {}, body: "{}" });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "The engine service returned an unreadable response." });
  });

  it("bounds the wait on a hung gateway", async () => {
    expect(PROXY_TIMEOUT_MS).toBeGreaterThan(0);

    const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => jsonResponse(200, {}));
    global.fetch = fetchMock as unknown as typeof fetch;
    await proxyToGateway("/api/run", { headers: {}, body: "{}", timeoutMs: 5 });

    const signal = (fetchMock.mock.calls[0][1] as RequestInit).signal as AbortSignal;
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(signal.aborted).toBe(true);
  });
});
