/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { NextRequest } from "next/server";

import { POST } from "./route";

/**
 * The trace route validates per category before proxying, so the gateway never
 * sees a payload it would only reject — these tests pin that boundary.
 */

const originalFetch = global.fetch;

function post(body: unknown): NextRequest {
  return new Request("http://localhost:3000/api/trace/execute/equality", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as unknown as NextRequest;
}

const params = (category: string) => ({ params: Promise.resolve({ category }) });

let fetchMock: ReturnType<typeof makeFetchMock>;

const makeFetchMock = (reply: () => Response) =>
  jest.fn(async (_url: string, _init?: RequestInit) => reply());

beforeEach(() => {
  process.env.JSLAB_BACKEND_URL = "http://api:8080";
  fetchMock = makeFetchMock(
    () => new Response(JSON.stringify({ success: true, root: null }), { status: 200 }),
  );
  global.fetch = fetchMock as unknown as typeof fetch;
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.JSLAB_BACKEND_URL;
  jest.restoreAllMocks();
});

describe("category routing", () => {
  it("404s a category the service does not implement", async () => {
    const res = await POST(post({ input: "1 == 1" }), params("coercion"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Unknown trace category "coercion"' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("proxies to the matching upstream path", async () => {
    await POST(post({ input: "1 == 1" }), params("equality"));
    expect(fetchMock.mock.calls[0][0]).toBe("http://api:8080/api/trace/execute/equality");

    await POST(post({ functionName: "ToNumber", input: "'1'" }), params("type-conversion"));
    expect(fetchMock.mock.calls[1][0]).toBe("http://api:8080/api/trace/execute/type-conversion");
  });
});

describe("body validation", () => {
  it("rejects a malformed body", async () => {
    const res = await POST(post("{nope"), params("equality"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body" });
  });

  it("rejects a body that is not an object", async () => {
    for (const body of ["5", '"text"', "null"]) {
      const res = await POST(post(body), params("equality"));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Request body must be an object" });
    }
  });

  it("rejects an array body at the field check, since it carries no fields", async () => {
    const res = await POST(post("[1,2]"), params("equality"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "input must be a non-empty string expression" });
  });

  it("requires equality to carry a non-empty expression", async () => {
    for (const body of [{}, { input: "" }, { input: "   " }, { input: 42 }]) {
      const res = await POST(post(body), params("equality"));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "input must be a non-empty string expression" });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires type-conversion to name a function", async () => {
    const res = await POST(post({ input: "1" }), params("type-conversion"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "functionName is required and must be a string" });
  });

  it("requires type-conversion input to be a string of source text", async () => {
    for (const input of [undefined, null, 0, false, [], {}]) {
      const res = await POST(post({ functionName: "ToNumber", input }), params("type-conversion"));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toContain("source text");
    }
  });

  it("accepts source text that spells a falsy value, which is a legitimate trace subject", async () => {
    for (const input of ["null", "0", "false", ""]) {
      const res = await POST(post({ functionName: "ToNumber", input }), params("type-conversion"));
      expect(res.status).toBe(200);
    }
  });

  it("accepts only the two preferredType hints the spec defines", async () => {
    const ok = await POST(
      post({ functionName: "ToPrimitive", input: "{}", preferredType: "string" }),
      params("type-conversion"),
    );
    expect(ok.status).toBe(200);

    const bad = await POST(
      post({ functionName: "ToPrimitive", input: "{}", preferredType: "default" }),
      params("type-conversion"),
    );
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: "preferredType must be 'string' or 'number'" });
  });

  it("forwards only the fields the trace service understands", async () => {
    await POST(
      post({ functionName: "ToNumber", input: "'1'", preferredType: "number", extra: "ignored" }),
      params("type-conversion"),
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ functionName: "ToNumber", input: "'1'", preferredType: "number" });
  });

  it("omits preferredType entirely when the caller did not send one", async () => {
    await POST(post({ functionName: "ToNumber", input: "'1'" }), params("type-conversion"));
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).not.toHaveProperty("preferredType");
  });
});

describe("upstream relaying", () => {
  it("returns the trace on success", async () => {
    const res = await POST(post({ input: "[] == ![]" }), params("equality"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, root: null });
  });

  it("relays an upstream failure with its status", async () => {
    global.fetch = jest.fn(
      async () =>
        new Response(JSON.stringify({ success: false, error: "budget exceeded" }), { status: 400 }),
    ) as unknown as typeof fetch;

    const res = await POST(post({ input: "1 == 1" }), params("equality"));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "budget exceeded" });
  });

  it("reports an unreachable trace backend as 503", async () => {
    global.fetch = jest.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;

    const res = await POST(post({ input: "1 == 1" }), params("equality"));
    expect(res.status).toBe(503);
  });
});
