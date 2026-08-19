/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { GET } from "./route";

const originalFetch = global.fetch;

beforeEach(() => {
  process.env.TRACE_SERVICE_URL = "http://trace-service:8080";
  delete process.env.JSLAB_REMOTE_SITE;
});

afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.TRACE_SERVICE_URL;
  delete process.env.JSLAB_REMOTE_SITE;
});

describe("GET /api/trace/functions", () => {
  it("relays the function catalog from the trace service", async () => {
    const catalog = { available_functions: ["ToNumber"], function_meta: {}, supported_operators: ["=="] };
    const fetchMock = jest.fn(async (_url: string) => new Response(JSON.stringify(catalog), { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(catalog);
    expect(fetchMock.mock.calls[0][0]).toBe("http://trace-service:8080/functions");
  });

  it("asks a configured remote site through its public path", async () => {
    process.env.JSLAB_REMOTE_SITE = "https://jslab.su";
    const fetchMock = jest.fn(async (_url: string) => new Response("{}", { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await GET();
    expect(fetchMock.mock.calls[0][0]).toBe("https://jslab.su/api/trace/functions");
  });

  it("relays an upstream error status", async () => {
    global.fetch = jest.fn(
      async () => new Response(JSON.stringify({ error: "nope" }), { status: 500 }),
    ) as unknown as typeof fetch;

    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("reports an unreachable trace service as 503 with the reason", async () => {
    global.fetch = jest.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;

    const res = await GET();
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain("ECONNREFUSED");
  });

  it("reports an unreadable response as 502", async () => {
    global.fetch = jest.fn(async () => new Response("<html>", { status: 200 })) as unknown as typeof fetch;

    const res = await GET();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Invalid response from trace-service" });
  });
});
