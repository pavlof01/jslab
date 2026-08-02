import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

import { EngineKey, RunStatus } from "@/lib/types";
import { useEngineOutputsStore } from "./useEngineOutputs";

type FakeResponse = { ok: boolean; status: number; body: unknown };

const okResponse = (body: unknown): FakeResponse => ({ ok: true, status: 200, body });

// The store talks to the API through lib/api, so drive it from the network edge
// instead of module-mocking; that also keeps the failure mapping under test.
const toResponse = (response: FakeResponse) => ({
  ok: response.ok,
  status: response.status,
  headers: { get: () => null },
  json: async () => response.body,
});

const originalFetch = globalThis.fetch;

const queueResponses = (...responses: (FakeResponse | Promise<FakeResponse>)[]) => {
  let call = 0;
  (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(async () => {
    const next = responses[Math.min(call++, responses.length - 1)];
    return toResponse(await next);
  });
};

const run = (code: string) => useEngineOutputsStore.getState().runEngines({ code, engines: [EngineKey.v8] });

describe("useEngineOutputsStore.runEngines", () => {
  beforeEach(() => {
    useEngineOutputsStore.getState().reset();
  });

  afterEach(() => {
    (globalThis as unknown as { fetch: unknown }).fetch = originalFetch;
  });

  it("reports an empty editor without spending a request", async () => {
    const fetchMock = jest.fn();
    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    await useEngineOutputsStore.getState().runEngines({ code: "   \n ", engines: [EngineKey.v8] });

    const state = useEngineOutputsStore.getState();
    expect(state.status).toBe(RunStatus.error);
    expect(state.error).toBe("Nothing to run — the editor is empty.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces a rate limit as a readable error and keeps stderr clean", async () => {
    queueResponses({
      ok: false,
      status: 429,
      body: { ok: false, error: "rate limit exceeded", meta: { retryAfter: 5 } },
    });

    await run("1 + 1");

    const state = useEngineOutputsStore.getState();
    expect(state.status).toBe(RunStatus.error);
    expect(state.error).toContain("5 seconds");
    expect(state.out[EngineKey.v8].stderr).toBe("");
  });

  it("marks the duration as cached when every engine hit the cache", async () => {
    queueResponses(okResponse({ ok: true, stdout: "out", stderr: "", meta: { durationMs: 7, cacheHit: true } }));

    await run("1 + 1");

    const state = useEngineOutputsStore.getState();
    expect(state.status).toBe(RunStatus.done);
    expect(state.meta).toBe("Duration: 7 ms · cached");
    expect(state.error).toBeUndefined();
  });

  it("does not let a slow earlier run overwrite a newer run's output", async () => {
    let resolveSlow: (value: FakeResponse) => void = () => {};
    const slowResponse = new Promise<FakeResponse>((resolve) => (resolveSlow = resolve));

    queueResponses(slowResponse, okResponse({ ok: true, stdout: "fast", stderr: "", meta: { durationMs: 1 } }));

    const slow = run("slow");
    const fast = run("fast");
    await fast;

    resolveSlow(okResponse({ ok: true, stdout: "slow", stderr: "", meta: { durationMs: 900 } }));
    await slow;

    const state = useEngineOutputsStore.getState();
    expect(state.out[EngineKey.v8].stdout).toBe("fast");
    expect(state.meta).toBe("Duration: 1 ms");
  });
});
