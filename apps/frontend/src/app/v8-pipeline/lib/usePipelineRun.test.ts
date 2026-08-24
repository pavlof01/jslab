import type { jest as JestGlobals } from "@jest/globals";

// The SWC jest transform hoists `jest.mock` above the imports only when `jest`
// is the ambient global rather than an @jest/globals import — and this
// project's tsconfig pins typeRoots, so the global needs declaring for TS.
declare const jest: typeof JestGlobals;
type MockFn = ReturnType<typeof JestGlobals.fn>;

jest.mock("@/lib/api", () => ({ __esModule: true, runEngine: jest.fn() }));

import { beforeEach, describe, expect, it } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react";

import { runEngine as runEngineImpl } from "@/lib/api";
import { API_STAGES } from "./stages";
import { usePipelineRun } from "./usePipelineRun";

/**
 * The pipeline page fans one snippet out to a d8 run per stage. These tests
 * drive the hook that owns that fan-out: one call per stage, per-stage status,
 * and a single readable message when the runs fail.
 */

const runEngine = runEngineImpl as unknown as MockFn;

const ok = (stdout: string, stderr = "") => ({ stdout, stderr, failure: undefined, meta: {} });

beforeEach(() => {
  runEngine.mockReset();
  runEngine.mockResolvedValue(ok("output"));
});

describe("before the first run", () => {
  it("reports every stage as idle", () => {
    const { result } = renderHook(() => usePipelineRun("const x = 1;"));
    expect(result.current.hasRun).toBe(false);
    expect(result.current.statusOf("tokens")).toBe("idle");
    for (const stage of API_STAGES) expect(result.current.statusOf(stage.id)).toBe("idle");
  });
});

describe("analyze", () => {
  it("runs every engine stage once, with that stage's flags", async () => {
    const { result } = renderHook(() => usePipelineRun("function f(){}"));

    await act(async () => {
      await result.current.analyze();
    });

    expect(runEngine).toHaveBeenCalledTimes(API_STAGES.length);
    for (const stage of API_STAGES) {
      expect(runEngine).toHaveBeenCalledWith("v8", "function f(){}", { flags: stage.flags });
    }
  });

  it("tokenizes locally rather than asking the engine", async () => {
    const { result } = renderHook(() => usePipelineRun("const x = 1;"));

    await act(async () => {
      await result.current.analyze();
    });

    expect(result.current.visibleTokens.length).toBeGreaterThan(0);
    // The tokenizer runs in the browser, so whitespace is dropped for display.
    expect(result.current.visibleTokens.some((token) => token.kind === "Whitespace")).toBe(false);
    expect(result.current.statusOf("tokens")).toBe("ok");
  });

  it("reports an empty tokens pane for a snippet with nothing in it", async () => {
    const { result } = renderHook(() => usePipelineRun(""));

    await act(async () => {
      await result.current.analyze();
    });

    expect(result.current.statusOf("tokens")).toBe("empty");
  });

  it("strips the tracing diagnostic d8 prints ahead of the real output", async () => {
    runEngine.mockResolvedValue(
      ok("Concurrent maglev has been disabled for tracing.\nreal output"),
    );
    const { result } = renderHook(() => usePipelineRun("const x = 1;"));

    await act(async () => {
      await result.current.analyze();
    });

    expect(result.current.outputs.bytecode.stdout).toBe("real output");
  });

  it("clears the loading flag on every stage once the runs settle", async () => {
    const { result } = renderHook(() => usePipelineRun("const x = 1;"));

    await act(async () => {
      await result.current.analyze();
    });

    await waitFor(() => expect(result.current.running).toBe(false));
    for (const stage of API_STAGES) expect(result.current.outputs[stage.id].loading).toBe(false);
  });
});

describe("per-stage status", () => {
  it("is ok when the stage produced output", async () => {
    const { result } = renderHook(() => usePipelineRun("const x = 1;"));
    await act(async () => {
      await result.current.analyze();
    });
    expect(result.current.statusOf("bytecode")).toBe("ok");
  });

  it("is empty when the stage ran but the tier never kicked in", async () => {
    // A cold function never reaches Maglev; that is a normal outcome, not an error.
    runEngine.mockResolvedValue(ok(""));
    const { result } = renderHook(() => usePipelineRun("const x = 1;"));
    await act(async () => {
      await result.current.analyze();
    });
    expect(result.current.statusOf("maglev")).toBe("empty");
  });

  it("is error when the stage produced only stderr", async () => {
    runEngine.mockResolvedValue(ok("", "SyntaxError: Unexpected token"));
    const { result } = renderHook(() => usePipelineRun("const ="));
    await act(async () => {
      await result.current.analyze();
    });
    expect(result.current.statusOf("turbofan")).toBe("error");
  });

  it("prefers ok when a stage wrote to both streams", async () => {
    runEngine.mockResolvedValue(ok("code", "a warning"));
    const { result } = renderHook(() => usePipelineRun("const x = 1;"));
    await act(async () => {
      await result.current.analyze();
    });
    expect(result.current.statusOf("bytecode")).toBe("ok");
  });
});

describe("failures", () => {
  it("summarizes a run failure into one message for the page", async () => {
    runEngine.mockResolvedValue({
      stdout: "",
      stderr: "",
      failure: { status: 429, message: "rate limit exceeded", retryAfterSeconds: 5 },
      meta: {},
    });

    const { result } = renderHook(() => usePipelineRun("const x = 1;"));
    await act(async () => {
      await result.current.analyze();
    });

    expect(result.current.error).toContain("rate limit");
    expect(result.current.error).toContain("5 seconds");
  });

  it("says nothing when every stage succeeded", async () => {
    const { result } = renderHook(() => usePipelineRun("const x = 1;"));
    await act(async () => {
      await result.current.analyze();
    });
    expect(result.current.error).toBe("");
  });

  it("clears a previous error on the next run", async () => {
    runEngine.mockResolvedValue({
      stdout: "",
      stderr: "",
      failure: { status: 500, message: "boom" },
      meta: {},
    });
    const { result } = renderHook(() => usePipelineRun("const x = 1;"));
    await act(async () => {
      await result.current.analyze();
    });
    expect(result.current.error).not.toBe("");

    runEngine.mockResolvedValue(ok("output"));
    await act(async () => {
      await result.current.analyze();
    });
    expect(result.current.error).toBe("");
  });
});
