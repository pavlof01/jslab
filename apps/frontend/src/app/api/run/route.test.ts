/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { NextRequest } from "next/server";

import { GET, POST } from "./route";

/**
 * Integration test for the Next route that fronts the API gateway: the real
 * handler, the real helpers, with only the outbound fetch replaced.
 */

const originalFetch = global.fetch;

function post(body: unknown, headers: Record<string, string> = {}): NextRequest {
  const init: RequestInit = {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
  return new Request("http://localhost:3000/api/run", init) as unknown as NextRequest;
}

beforeEach(() => {
  process.env.JSLAB_BACKEND_URL = "http://api:8080";
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.JSLAB_BACKEND_URL;
  jest.restoreAllMocks();
});

describe("POST /api/run", () => {
  it("forwards the run to the gateway and returns its response", async () => {
    const fetchMock = jest.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ ok: true, stdout: "42\n", meta: { engine: "v8" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await POST(post({ engine: "v8", sourceText: "print(42)" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, stdout: "42\n" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api:8080/api/run");
    expect(JSON.parse(init.body as string)).toEqual({ engine: "v8", sourceText: "print(42)" });
  });

  it("passes the caller's API key and address through to the gateway", async () => {
    const fetchMock = jest.fn(
      async (_url: string, _init?: RequestInit) => new Response("{}", { status: 200 }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await POST(
      post(
        { engine: "v8", sourceText: "1" },
        { "x-api-key": "jslab_abc", "x-forwarded-for": "9.9.9.9" },
      ),
    );

    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("jslab_abc");
    expect(headers["x-forwarded-for"]).toBe("9.9.9.9");
  });

  it("rejects a malformed body before calling the gateway", async () => {
    const fetchMock = jest.fn(
      async (_url: string, _init?: RequestInit) => new Response("{}", { status: 200 }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await POST(post("{not json"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("relays a gateway rejection with its status", async () => {
    global.fetch = jest.fn(
      async () =>
        new Response(JSON.stringify({ ok: false, error: "engine: invalid" }), { status: 400 }),
    ) as unknown as typeof fetch;

    const res = await POST(post({ engine: "quickjs", sourceText: "1" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "engine: invalid" });
  });

  it("reports an unreachable gateway as 503", async () => {
    global.fetch = jest.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;

    const res = await POST(post({ engine: "v8", sourceText: "1" }));
    expect(res.status).toBe(503);
  });
});

describe("GET /api/run", () => {
  it("is not allowed — runs are POST only", async () => {
    const res = GET();
    expect(res.status).toBe(405);
    expect(await res.json()).toEqual({ error: "Method Not Allowed" });
  });
});
