/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { GET } from "./route";

/**
 * Serves spec HTML straight from the trace service, so the interesting part is
 * the name guard: `functionName` lands in a URL path, and the response is HTML
 * this app then renders.
 */

const originalFetch = global.fetch;
const params = (functionName: string) => ({ params: Promise.resolve({ functionName }) });
const request = () => new Request("http://localhost:3000/api/spec/ToNumber");

let fetchMock: ReturnType<typeof makeFetchMock>;

const makeFetchMock = (reply: () => Response) => jest.fn(async (_url: string) => reply());

beforeEach(() => {
  process.env.TRACE_SERVICE_URL = "http://trace-service:8080";
  delete process.env.JSLAB_REMOTE_SITE;
  fetchMock = makeFetchMock(() => new Response("<emu-alg>steps</emu-alg>", { status: 200 }));
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.TRACE_SERVICE_URL;
  delete process.env.JSLAB_REMOTE_SITE;
});

describe("name validation", () => {
  it.each(["ToNumber", "Number::toString", "Object.prototype", "ToInt32"])(
    "accepts %s",
    async (name) => {
      expect((await GET(request(), params(name))).status).toBe(200);
    },
  );

  it.each([
    ["a traversal attempt", "../../etc/passwd"],
    ["a path separator", "To/Number"],
    ["a query string", "ToNumber?x=1"],
    ["a leading digit", "2Number"],
    ["an empty name", ""],
    ["a trailing separator", "ToNumber::"],
  ])("rejects %s", async (_label, name) => {
    const res = await GET(request(), params(name));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Not a valid abstract operation name" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("upstream selection", () => {
  it("asks the trace service directly by default", async () => {
    await GET(request(), params("ToNumber"));
    expect(fetchMock.mock.calls[0][0]).toBe("http://trace-service:8080/spec/ToNumber");
  });

  it("asks a configured remote site instead, through its public path", async () => {
    process.env.JSLAB_REMOTE_SITE = "https://jslab.su/";
    await GET(request(), params("ToNumber"));
    expect(fetchMock.mock.calls[0][0]).toBe("https://jslab.su/api/spec/ToNumber");
  });

  it("percent-encodes the operation name it puts in the URL", async () => {
    await GET(request(), params("Number::toString"));
    expect(fetchMock.mock.calls[0][0]).toContain("Number%3A%3AtoString");
  });
});

describe("responses", () => {
  it("returns the spec HTML with a cache and a sniffing guard", async () => {
    const res = await GET(request(), params("ToNumber"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("public, max-age=3600");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await res.text()).toBe("<emu-alg>steps</emu-alg>");
  });

  it("relays an upstream 404 with its body", async () => {
    global.fetch = jest.fn(
      async () =>
        new Response(JSON.stringify({ error: 'No spec available for "Nope"' }), { status: 404 }),
    ) as unknown as typeof fetch;

    const res = await GET(request(), params("Nope"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'No spec available for "Nope"' });
  });

  it("answers 502 when the upstream replies with no usable body", async () => {
    global.fetch = jest.fn(
      async () => new Response("", { status: 503, statusText: "Service Unavailable" }),
    ) as unknown as typeof fetch;

    const res = await GET(request(), params("ToNumber"));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Invalid response from trace-service" });
  });

  it("answers 503 when the upstream cannot be reached at all", async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;

    const res = await GET(request(), params("ToNumber"));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "trace-service unavailable: fetch failed" });
  });

  it("reports an unreachable trace service as 503 with the reason", async () => {
    global.fetch = jest.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;

    const res = await GET(request(), params("ToNumber"));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain("ECONNREFUSED");
  });
});
