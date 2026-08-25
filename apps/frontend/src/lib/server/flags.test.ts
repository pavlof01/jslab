/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { fetchFlagCatalog } from "./flags";

/**
 * The playground's flag picker is server-rendered from the gateway's catalog.
 * A missing catalog must degrade to an empty picker, never to a 500 page.
 */

const originalFetch = global.fetch;

const reply = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

const v8 = [{ flag: "--print-bytecode", description: "dump bytecode", category: "bytecode" }];
const hermes = [{ flag: "-O", description: "optimize", category: "codegen" }];

beforeEach(() => {
  process.env.JSLAB_BACKEND_URL = "http://api:8080";
});

afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.JSLAB_BACKEND_URL;
});

describe("fetchFlagCatalog", () => {
  it("returns every engine the gateway advertises, not just V8", async () => {
    global.fetch = jest.fn(async () =>
      reply(200, { engines: { v8, hermes } }),
    ) as unknown as typeof fetch;

    expect(await fetchFlagCatalog()).toEqual({ v8, hermes });
  });

  it("asks the gateway once per render pass, with revalidation", async () => {
    const fetchMock = jest.fn<typeof fetch>(async () => reply(200, { engines: { v8 } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchFlagCatalog();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api:8080/api/flags",
      expect.objectContaining({ next: { revalidate: 3600 } }),
    );
  });

  it("drops an engine the app does not know", async () => {
    global.fetch = jest.fn(async () =>
      reply(200, { engines: { v8, quickjs: v8 } }),
    ) as unknown as typeof fetch;

    expect(await fetchFlagCatalog()).toEqual({ v8 });
  });

  it("drops an engine whose entry is empty or not a list", async () => {
    global.fetch = jest.fn(async () =>
      reply(200, { engines: { v8, hermes: [], jsc: "nope" } }),
    ) as unknown as typeof fetch;

    expect(await fetchFlagCatalog()).toEqual({ v8 });
  });

  it("returns nothing when the gateway rejects the request", async () => {
    global.fetch = jest.fn(async () => reply(503, {})) as unknown as typeof fetch;

    expect(await fetchFlagCatalog()).toEqual({});
  });

  it("returns nothing when the gateway is unreachable", async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;

    expect(await fetchFlagCatalog()).toEqual({});
  });

  it("returns nothing when the payload carries no engines at all", async () => {
    global.fetch = jest.fn(async () => reply(200, {})) as unknown as typeof fetch;

    expect(await fetchFlagCatalog()).toEqual({});
  });

  it("returns nothing when the body is not JSON at all", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    })) as unknown as typeof fetch;

    expect(await fetchFlagCatalog()).toEqual({});
  });
});
