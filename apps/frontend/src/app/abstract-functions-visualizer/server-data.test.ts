/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { type AlgoCategory, DEFAULTS_BY_CATEGORY, EMPTY_FUNCTION_CATALOG } from "./model";

/**
 * The spec pages are server-rendered with a prefetched trace. That prefetch is
 * best-effort: every upstream failure has to end as an empty-but-renderable
 * page, and a failed prefetch must not be cached as if it had worked.
 *
 * The module keeps a process-wide cache, so each test re-imports it fresh.
 */

const originalFetch = global.fetch;

type Handler = (url: string, init?: RequestInit) => Response;

function html(body: string): Response {
  return { ok: true, status: 200, statusText: "OK", text: async () => body } as unknown as Response;
}

function json(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Service Unavailable",
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const traceOk = {
  success: true,
  root: { algoId: "ToNumber", inputs: [], steps: [] },
  result: { type: "Number", value: 1 },
  effectiveAlgoId: "ToNumber",
  detectedOperator: "==",
};

const catalog = {
  available_functions: ["ToNumber"],
  function_meta: { ToNumber: { category: "typeConversion", arity: "unary" } },
  supported_operators: ["=="],
};

/** Route each upstream path to a canned reply; anything unrouted is a 404. */
function routes(
  over: Partial<Record<"functions" | "spec" | "execute", Response>> = {},
): jest.Mock<Handler> {
  return jest.fn(((url: string) => {
    if (url.includes("/functions")) return over.functions ?? json(200, catalog);
    if (url.includes("/spec/")) return over.spec ?? html("<emu-alg>steps</emu-alg>");
    if (url.includes("/execute/")) return over.execute ?? json(200, traceOk);
    return json(404, { error: `unrouted ${url}` });
  }) as Handler);
}

async function load() {
  let mod!: typeof import("./server-data");
  await jest.isolateModulesAsync(async () => {
    mod = await import("./server-data");
  });
  return mod;
}

function install(handler: jest.Mock<Handler>) {
  global.fetch = (async (url: string, init?: RequestInit) =>
    handler(String(url), init)) as unknown as typeof fetch;
  return handler;
}

beforeEach(() => {
  process.env.TRACE_SERVICE_URL = "http://trace-service:8080";
});

afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.TRACE_SERVICE_URL;
});

describe("getVisualizerInitialData — happy path", () => {
  it("assembles the catalog, the spec html and a prefetched trace", async () => {
    install(routes());
    const { getVisualizerInitialData } = await load();

    const data = await getVisualizerInitialData("typeConversion");

    expect(data.category).toBe("typeConversion");
    expect(data.selectedAlgo).toBe(DEFAULTS_BY_CATEGORY.typeConversion.algo);
    expect(data.input).toBe(DEFAULTS_BY_CATEGORY.typeConversion.input);
    expect(data.specHtml).toBe("<emu-alg>steps</emu-alg>");
    expect(data.functionCatalog).toEqual(catalog);
    expect(data.trace).toEqual({
      root: traceOk.root,
      result: traceOk.result,
      effectiveAlgoId: "ToNumber",
      detectedOperator: "==",
      error: null,
    });
  });

  it("asks the trace service for the category's own endpoint and body", async () => {
    const handler = install(routes());
    const { getVisualizerInitialData } = await load();

    await getVisualizerInitialData("equality");

    const execute = handler.mock.calls.find(([url]) => url.includes("/execute/"))!;
    expect(execute[0]).toBe("http://trace-service:8080/execute/equality");
    expect(JSON.parse((execute[1] as RequestInit).body as string)).toEqual({
      input: DEFAULTS_BY_CATEGORY.equality.input,
    });
  });

  it("posts the function name for a type-conversion prefetch", async () => {
    const handler = install(routes());
    const { getVisualizerInitialData } = await load();

    await getVisualizerInitialData("typeConversion");

    const execute = handler.mock.calls.find(([url]) => url.includes("/execute/"))!;
    expect(execute[0]).toContain("/execute/type-conversion");
    expect(JSON.parse((execute[1] as RequestInit).body as string)).toEqual({
      functionName: DEFAULTS_BY_CATEGORY.typeConversion.algo,
      input: DEFAULTS_BY_CATEGORY.typeConversion.input,
    });
  });

  it("percent-encodes the algorithm name in the spec URL", async () => {
    const handler = install(routes());
    const { getVisualizerInitialData } = await load();

    await getVisualizerInitialData("equality");

    const spec = handler.mock.calls.find(([url]) => url.includes("/spec/"))!;
    expect(spec[0]).toBe("http://trace-service:8080/spec/BinaryExpression");
  });
});

describe("getVisualizerInitialData — degraded upstreams", () => {
  it("renders with an empty catalog when /functions fails", async () => {
    install(routes({ functions: json(503, { error: "down" }) }));
    const { getVisualizerInitialData } = await load();

    const data = await getVisualizerInitialData("typeConversion");
    expect(data.functionCatalog).toEqual(EMPTY_FUNCTION_CATALOG);
    // The trace still made it, so the page is far from empty.
    expect(data.trace.root).not.toBeNull();
  });

  it("fills in the missing halves of a partial catalog", async () => {
    install(routes({ functions: json(200, {}) }));
    const { getVisualizerInitialData } = await load();

    const data = await getVisualizerInitialData("typeConversion");
    expect(data.functionCatalog.available_functions).toEqual([]);
    expect(data.functionCatalog.function_meta).toEqual({});
  });

  it("renders with no spec html when /spec fails", async () => {
    install(routes({ spec: json(404, { error: "no spec" }) }));
    const { getVisualizerInitialData } = await load();

    expect((await getVisualizerInitialData("typeConversion")).specHtml).toBe("");
  });

  it("carries the trace service's own error message onto the page", async () => {
    install(routes({ execute: json(400, { error: "execution budget exceeded" }) }));
    const { getVisualizerInitialData } = await load();

    const data = await getVisualizerInitialData("typeConversion");
    expect(data.trace.error).toBe("execution budget exceeded");
    expect(data.trace.root).toBeNull();
  });

  it("falls back to the status text when the error body carries no message", async () => {
    install(routes({ execute: json(503, {}) }));
    const { getVisualizerInitialData } = await load();

    expect((await getVisualizerInitialData("typeConversion")).trace.error).toBe(
      "Service Unavailable",
    );
  });

  it("reports a 200 that says success:false as a failed trace", async () => {
    install(routes({ execute: json(200, { success: false, error: "Unknown function" }) }));
    const { getVisualizerInitialData } = await load();

    const data = await getVisualizerInitialData("typeConversion");
    expect(data.trace.error).toBe("Unknown function");
    expect(data.trace.root).toBeNull();
  });

  it("supplies a message when even the failure has none", async () => {
    install(routes({ execute: json(200, { success: false }) }));
    const { getVisualizerInitialData } = await load();

    expect((await getVisualizerInitialData("typeConversion")).trace.error).toBe(
      "trace-service returned failure",
    );
  });

  it("survives the trace service being unreachable entirely", async () => {
    global.fetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const { getVisualizerInitialData } = await load();

    const data = await getVisualizerInitialData("equality");
    expect(data.trace.error).toBe("ECONNREFUSED");
    expect(data.specHtml).toBe("");
    expect(data.functionCatalog).toEqual(EMPTY_FUNCTION_CATALOG);
    // Still a complete, renderable payload.
    expect(data.selectedAlgo).toBe(DEFAULTS_BY_CATEGORY.equality.algo);
  });
});

describe("getVisualizerInitialData — caching", () => {
  it("serves a second request for the same category from memory", async () => {
    const handler = install(routes());
    const { getVisualizerInitialData } = await load();

    const first = await getVisualizerInitialData("typeConversion");
    const callsAfterFirst = handler.mock.calls.length;
    const second = await getVisualizerInitialData("typeConversion");

    expect(second).toBe(first);
    expect(handler.mock.calls.length).toBe(callsAfterFirst);
  });

  it("caches each category separately", async () => {
    const handler = install(routes());
    const { getVisualizerInitialData } = await load();

    await getVisualizerInitialData("typeConversion");
    const callsAfterFirst = handler.mock.calls.length;
    await getVisualizerInitialData("equality");

    expect(handler.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it("does not cache a failed prefetch, so the next request retries", async () => {
    const handler = install(routes({ execute: json(503, { error: "down" }) }));
    const { getVisualizerInitialData } = await load();

    await getVisualizerInitialData("typeConversion");
    const callsAfterFirst = handler.mock.calls.length;
    await getVisualizerInitialData("typeConversion");

    expect(handler.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it("re-fetches once the cache entry has expired", async () => {
    const handler = install(routes());
    const { getVisualizerInitialData } = await load();

    await getVisualizerInitialData("typeConversion");
    const callsAfterFirst = handler.mock.calls.length;

    // The TTL is five minutes; jump past it.
    const realNow = Date.now;
    Date.now = () => realNow() + 6 * 60 * 1000;
    try {
      await getVisualizerInitialData("typeConversion");
    } finally {
      Date.now = realNow;
    }

    expect(handler.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });
});

describe("request shape", () => {
  it("never serves the prefetch from an HTTP cache", async () => {
    const handler = install(routes());
    const { getVisualizerInitialData } = await load();

    await getVisualizerInitialData("typeConversion" as AlgoCategory);

    for (const [, init] of handler.mock.calls) {
      expect((init as RequestInit).cache).toBe("no-store");
    }
  });
});
