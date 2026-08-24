import type { jest as JestGlobals } from "@jest/globals";

// The SWC jest transform hoists `jest.mock` above the imports only when `jest`
// is the ambient global rather than an @jest/globals import — and this
// project's tsconfig pins typeRoots, so the global needs declaring for TS.
declare const jest: typeof JestGlobals;
type MockFn = ReturnType<typeof JestGlobals.fn>;

jest.mock("./traceApi", () => ({ __esModule: true, executeTrace: jest.fn() }));

import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import type { VisualizerInitialData } from "./model";
import type { TraceNode } from "./spec-runner";
import { createVisualizerStore, DEFAULTS_BY_CATEGORY } from "./store";
import { executeTrace as executeTraceImpl } from "./traceApi";

/**
 * The visualizer store owns everything the spec pages do: hold a trace, walk
 * it, switch category, and re-run against the trace service. `executeTrace` is
 * the store's one outside dependency and is mocked; everything else is real.
 */

const executeTrace = executeTraceImpl as unknown as MockFn;

/** A three-step trace: two plain operations and a return. */
function trace(algoId = "ToNumber"): TraceNode {
  return {
    algoId,
    inputs: [{ type: "String", value: "42" }],
    output: { type: "Number", value: 42 },
    steps: [
      { kind: "operation", description: "first" },
      { kind: "operation", description: "second" },
      { kind: "return", value: { type: "Number", value: 42 } },
    ],
  };
}

const serverData = (over: Partial<VisualizerInitialData> = {}): VisualizerInitialData => ({
  category: "typeConversion",
  selectedAlgo: "ToNumber",
  input: "'42'",
  specHtml: "<emu-alg/>",
  trace: {
    root: trace(),
    result: { type: "Number", value: 42 },
    effectiveAlgoId: "ToNumber",
    detectedOperator: null,
    error: null,
  },
  functionCatalog: {
    available_functions: ["ToNumber", "ToString"],
    function_meta: { ToNumber: { category: "typeConversion", arity: "unary" } },
  },
  ...over,
});

beforeEach(() => {
  executeTrace.mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("initial state", () => {
  it("starts on the type-conversion defaults with nothing traced", () => {
    const state = createVisualizerStore().getState();
    expect(state.category).toBe("typeConversion");
    expect(state.selectedAlgo).toBe(DEFAULTS_BY_CATEGORY.typeConversion.algo);
    expect(state.traceInputRaw).toBe(DEFAULTS_BY_CATEGORY.typeConversion.input);
    expect(state.root).toBeNull();
    expect(state.flatEntries).toEqual([]);
    expect(state.maxIndex()).toBe(0);
  });

  it("hydrates from the server payload when one is supplied", () => {
    const state = createVisualizerStore(serverData()).getState();
    expect(state.root).not.toBeNull();
    expect(state.flatEntries.length).toBeGreaterThan(0);
    expect(state.specHtml).toBe("<emu-alg/>");
    expect(state.functionOptions).toEqual(["ToNumber", "ToString"]);
    expect(state.resultValue).toEqual({ type: "Number", value: 42 });
  });

  it("carries a server-side trace error into the store", () => {
    const store = createVisualizerStore(
      serverData({
        trace: { root: null, effectiveAlgoId: null, detectedOperator: null, error: "boom" },
      }),
    );
    expect(store.getState().error).toBe("boom");
    expect(store.getState().flatEntries).toEqual([]);
  });
});

describe("setRoot", () => {
  it("flattens the trace and rewinds playback", () => {
    const store = createVisualizerStore();
    store.getState().onSelectIndex(0);
    store.getState().toggleBlock("0");

    store.getState().setRoot(trace());

    expect(store.getState().flatEntries.length).toBeGreaterThan(0);
    expect(store.getState().selectedIndex).toBe(0);
    // A new trace invalidates the old collapse state, which was keyed by path.
    expect(store.getState().collapsedBlocks).toEqual({});
  });

  it("clears the flattened entries when the trace goes away", () => {
    const store = createVisualizerStore(serverData());
    store.getState().setRoot(null);
    expect(store.getState().flatEntries).toEqual([]);
    expect(store.getState().maxIndex()).toBe(0);
  });
});

describe("category switching", () => {
  it("resets the algorithm, the input and the trace", () => {
    const store = createVisualizerStore(serverData());

    store.getState().setCategory("equality");

    const state = store.getState();
    expect(state.category).toBe("equality");
    expect(state.selectedAlgo).toBe(DEFAULTS_BY_CATEGORY.equality.algo);
    expect(state.traceInputRaw).toBe(DEFAULTS_BY_CATEGORY.equality.input);
    expect(state.traceInputExpression).toBe(DEFAULTS_BY_CATEGORY.equality.input);
    // Leaving a stale trace on screen under a new category would misrepresent it.
    expect(state.root).toBeNull();
    expect(state.flatEntries).toEqual([]);
    expect(state.error).toBeNull();
    expect(state.effectiveAlgoId).toBeNull();
  });
});

describe("input editing", () => {
  it("keeps typing out of the trace until it is committed", () => {
    const store = createVisualizerStore();
    const before = store.getState().traceRequestId;

    store.getState().setTraceInputRaw("'99'");

    expect(store.getState().traceInputRaw).toBe("'99'");
    expect(store.getState().traceInputExpression).not.toBe("'99'");
    expect(store.getState().traceRequestId).toBe(before);
  });

  it("bumps the request id on commit so the page re-runs", () => {
    const store = createVisualizerStore();
    store.getState().commitTraceInput("'99'");
    store.getState().commitTraceInput("'99'");

    expect(store.getState().traceInputExpression).toBe("'99'");
    // Committing the same text again still counts: it is an explicit re-run.
    expect(store.getState().traceRequestId).toBe(2);
  });
});

describe("playback", () => {
  it("clamps a selected index into the trace", () => {
    const store = createVisualizerStore(serverData());
    const max = store.getState().maxIndex();

    store.getState().onSelectIndex(999);
    expect(store.getState().selectedIndex).toBe(max);

    store.getState().onSelectIndex(-5);
    expect(store.getState().selectedIndex).toBe(0);
  });

  it("stops playing when the user picks a step", () => {
    const store = createVisualizerStore(serverData());
    store.getState().setIsPlaying(true);
    store.getState().onSelectIndex(1);
    expect(store.getState().isPlaying).toBe(false);
  });

  it("selects a step by its path", () => {
    const store = createVisualizerStore(serverData());
    const target = store.getState().flatEntries[1];

    store.getState().onSelectPath(target.path);

    expect(store.getState().selectedIndex).toBe(1);
  });

  it("ignores a path that is not in the current trace", () => {
    const store = createVisualizerStore(serverData());
    store.getState().onSelectIndex(1);
    store.getState().onSelectPath("no-such-path");
    expect(store.getState().selectedIndex).toBe(1);
  });

  it("advances one step per tick and stops at the end", () => {
    const store = createVisualizerStore(serverData());
    const max = store.getState().maxIndex();
    store.getState().setIsPlaying(true);

    for (let i = 0; i < max; i++) store.getState().tickPlayback();
    expect(store.getState().selectedIndex).toBe(max);
    expect(store.getState().isPlaying).toBe(true);

    store.getState().tickPlayback();
    expect(store.getState().selectedIndex).toBe(max);
    expect(store.getState().isPlaying).toBe(false);
  });

  it("toggles play state, including through an updater", () => {
    const store = createVisualizerStore();
    store.getState().setIsPlaying(true);
    expect(store.getState().isPlaying).toBe(true);
    store.getState().setIsPlaying((previous) => !previous);
    expect(store.getState().isPlaying).toBe(false);
  });
});

describe("collapse state", () => {
  it("toggles a block on and off by path", () => {
    const store = createVisualizerStore();

    store.getState().toggleBlock("0.then");
    expect(store.getState().collapsedBlocks["0.then"]).toBe(true);

    store.getState().toggleBlock("0.then");
    expect(store.getState().collapsedBlocks["0.then"]).toBe(false);
  });

  it("keeps blocks independent of each other", () => {
    const store = createVisualizerStore();
    store.getState().toggleBlock("a");
    expect(store.getState().collapsedBlocks.b).toBeUndefined();
  });
});

describe("runNow", () => {
  it("stores the trace it gets back and clears the in-flight flag", async () => {
    executeTrace.mockResolvedValue({
      root: trace("IsLooselyEqual"),
      result: { type: "Boolean", value: true },
      effectiveAlgoId: "IsLooselyEqual",
      detectedOperator: "==",
    });

    const store = createVisualizerStore();
    await store.getState().runNow();

    const state = store.getState();
    expect(state.root?.algoId).toBe("IsLooselyEqual");
    expect(state.flatEntries.length).toBeGreaterThan(0);
    expect(state.resultValue).toEqual({ type: "Boolean", value: true });
    expect(state.effectiveAlgoId).toBe("IsLooselyEqual");
    expect(state.detectedOperator).toBe("==");
    expect(state.isTracing).toBe(false);
    expect(state.error).toBeNull();
  });

  it("asks for the trace the current input describes", async () => {
    executeTrace.mockResolvedValue({ root: null, effectiveAlgoId: null, detectedOperator: null });

    const store = createVisualizerStore();
    store.getState().setCategory("equality");
    store.getState().commitTraceInput("[] == ![]");
    await store.getState().runNow();

    expect(executeTrace).toHaveBeenCalledWith("equality", "BinaryExpression", "[] == ![]");
  });

  it("stops playback before running", async () => {
    executeTrace.mockResolvedValue({ root: null, effectiveAlgoId: null, detectedOperator: null });
    const store = createVisualizerStore(serverData());
    store.getState().setIsPlaying(true);

    await store.getState().runNow();

    expect(store.getState().isPlaying).toBe(false);
  });

  it("surfaces a failure and clears the stale trace", async () => {
    executeTrace.mockRejectedValue(new Error("execution budget exceeded"));

    const store = createVisualizerStore(serverData());
    await store.getState().runNow();

    const state = store.getState();
    expect(state.error).toBe("execution budget exceeded");
    expect(state.root).toBeNull();
    expect(state.resultValue).toBeUndefined();
    expect(state.effectiveAlgoId).toBeNull();
    expect(state.isTracing).toBe(false);
  });

  it("describes a non-Error rejection rather than showing 'undefined'", async () => {
    executeTrace.mockRejectedValue("just a string");
    const store = createVisualizerStore();
    await store.getState().runNow();
    expect(store.getState().error).toBe("Unknown executor error");
  });

  it("ignores a slow response that a newer run has superseded", async () => {
    // Typing quickly fires overlapping traces; the last one must win.
    let resolveFirst: (value: unknown) => void = () => {};
    executeTrace
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce({
        root: trace("second"),
        result: { type: "Number", value: 2 },
        effectiveAlgoId: "second",
        detectedOperator: null,
      });

    const store = createVisualizerStore();
    const first = store.getState().runNow();
    await store.getState().runNow();

    resolveFirst({
      root: trace("first"),
      result: { type: "Number", value: 1 },
      effectiveAlgoId: "first",
      detectedOperator: null,
    });
    await first;

    expect(store.getState().root?.algoId).toBe("second");
    expect(store.getState().resultValue).toEqual({ type: "Number", value: 2 });
  });

  it("ignores a superseded failure too", async () => {
    let rejectFirst: (reason: unknown) => void = () => {};
    executeTrace
      .mockImplementationOnce(() => new Promise((_resolve, reject) => (rejectFirst = reject)))
      .mockResolvedValueOnce({
        root: trace("winner"),
        effectiveAlgoId: "winner",
        detectedOperator: null,
      });

    const store = createVisualizerStore();
    const first = store.getState().runNow();
    await store.getState().runNow();

    rejectFirst(new Error("stale failure"));
    await first;

    expect(store.getState().error).toBeNull();
    expect(store.getState().root?.algoId).toBe("winner");
  });
});

describe("setters", () => {
  it("replaces the function catalog wholesale", () => {
    const store = createVisualizerStore();
    store.getState().setFunctionCatalog({
      available_functions: ["ToPrimitive"],
      function_meta: { ToPrimitive: { category: "typeConversion", arity: "unary" } },
    });

    expect(store.getState().functionOptions).toEqual(["ToPrimitive"]);
    expect(store.getState().functionMeta.ToPrimitive.arity).toBe("unary");
  });

  it("stores the spec html, the selected algorithm and the skipped-step toggle", () => {
    const store = createVisualizerStore();
    store.getState().setSpecHtml("<p/>");
    store.getState().setSelectedAlgo("ToString");
    store.getState().setShowSkipped(false);
    store.getState().setError("nope");

    const state = store.getState();
    expect(state.specHtml).toBe("<p/>");
    expect(state.selectedAlgo).toBe("ToString");
    expect(state.showSkipped).toBe(false);
    expect(state.error).toBe("nope");
  });
});
