import { describe, expect, it } from "@jest/globals";

import { API_STAGES, STAGES, stripDiagnostics } from "./stages";

describe("pipeline stages", () => {
  it("starts in the browser and ends at the runtime", () => {
    expect(STAGES[0].id).toBe("tokens");
    expect(STAGES.at(-1)!.id).toBe("deopt");
  });

  it("gives every stage a unique id", () => {
    const ids = STAGES.map((stage) => stage.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("treats exactly the flag-bearing stages as engine calls", () => {
    // The tokenizer runs locally; everything else needs a d8 run.
    expect(API_STAGES.map((stage) => stage.id)).toEqual(["ast", "bytecode", "sparkplug", "maglev", "turbofan", "deopt"]);
    expect(STAGES.find((stage) => stage.id === "tokens")!.flags).toBeUndefined();
  });

  it("passes --allow-natives-syntax to every engine stage", () => {
    // Pipeline snippets use %OptimizeFunctionOnNextCall and friends.
    for (const stage of API_STAGES) expect(stage.flags).toContain("--allow-natives-syntax");
  });

  it("asks for exactly one print/trace flag family per stage", () => {
    for (const stage of API_STAGES) {
      const printing = stage.flags.filter((flag) => flag !== "--allow-natives-syntax");
      expect(printing.length).toBeGreaterThan(0);
      for (const flag of printing) expect(flag).toMatch(/^--(print|trace)-/);
    }
  });

  it("explains the stages a snippet may legitimately fail to reach", () => {
    // Maglev and TurboFan need a hot function; without the hint an empty pane
    // reads as a broken tool.
    for (const id of ["tokens", "sparkplug", "maglev", "turbofan"]) {
      expect(STAGES.find((stage) => stage.id === id)!.hint).toBeTruthy();
    }
  });

  it("renders each stage through a known view", () => {
    for (const stage of STAGES) {
      expect(["tokens", "bytecode", "machineCode", "deoptEvents"]).toContain(stage.view);
    }
  });
});

describe("stripDiagnostics", () => {
  it("removes the tracing notice d8 prints before the real output", () => {
    const raw = "Concurrent maglev has been disabled for tracing.\n--- Optimized code ---\nkind = MAGLEV";
    expect(stripDiagnostics(raw)).toBe("--- Optimized code ---\nkind = MAGLEV");
  });

  it("removes the notice wherever it appears, not just on the first line", () => {
    const raw = "first\nConcurrent maglev has been disabled for tracing.\nlast";
    expect(stripDiagnostics(raw)).toBe("first\nlast");
  });

  it("trims surrounding blank space", () => {
    expect(stripDiagnostics("\n\n  output  \n\n")).toBe("output");
  });

  it("leaves output with no diagnostics untouched", () => {
    expect(stripDiagnostics("kind = TURBOFAN\nname = f")).toBe("kind = TURBOFAN\nname = f");
  });

  it("returns an empty string when the diagnostic was all there was", () => {
    expect(stripDiagnostics("Concurrent maglev has been disabled for tracing.")).toBe("");
  });
});
