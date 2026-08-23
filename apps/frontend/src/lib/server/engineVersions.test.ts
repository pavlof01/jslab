/**
 * @jest-environment node
 */
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { ENGINE_VERSIONS_TIMEOUT_MS, fetchEngineVersions } from "./engineVersions";

const originalFetch = global.fetch;

function json(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function respondWith(response: Response | Error) {
  global.fetch = jest.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  }) as unknown as typeof fetch;
}

afterEach(() => {
  global.fetch = originalFetch;
});

describe("fetchEngineVersions", () => {
  it("keeps the engines that reported a version", async () => {
    respondWith(
      json(200, {
        engines: [
          { engine: "v8", ok: true, version: "14.9.0 (candidate)" },
          { engine: "hermes", ok: true, version: "1.0.0 (HBC 98)" },
        ],
      }),
    );

    await expect(fetchEngineVersions()).resolves.toEqual({
      v8: "14.9.0 (candidate)",
      hermes: "1.0.0 (HBC 98)",
    });
  });

  it("omits an engine that cannot state its version", async () => {
    respondWith(
      json(200, {
        engines: [
          { engine: "jsc", ok: true, version: null },
          { engine: "sm", ok: false, version: null },
          { engine: "v8", ok: true, version: "14.9.0" },
        ],
      }),
    );

    await expect(fetchEngineVersions()).resolves.toEqual({ v8: "14.9.0" });
  });

  it("ignores an engine key the frontend does not know", async () => {
    respondWith(json(200, { engines: [{ engine: "quickjs", ok: true, version: "1.0" }] }));

    await expect(fetchEngineVersions()).resolves.toEqual({});
  });

  it("is empty when the gateway answers with an error", async () => {
    respondWith(json(503, { error: "unavailable" }));

    await expect(fetchEngineVersions()).resolves.toEqual({});
  });

  it("is empty when the gateway cannot be reached at all", async () => {
    respondWith(new Error("ECONNREFUSED"));

    await expect(fetchEngineVersions()).resolves.toEqual({});
  });

  it("bounds how long a page render waits for it", async () => {
    const fetchMock = jest.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      json(200, { engines: [] }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchEngineVersions();

    expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    expect(ENGINE_VERSIONS_TIMEOUT_MS).toBeLessThanOrEqual(5_000);
  });
});
