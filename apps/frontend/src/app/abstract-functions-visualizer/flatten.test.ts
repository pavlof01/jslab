import { describe, it, expect } from "@jest/globals";
import { flattenTrace } from "./flatten";
import type { TraceNode } from "./spec-runner";

// A ToNumber root whose step 1 is a call into ToPrimitive with two nested steps.
const tree: TraceNode = {
  algoId: "ToNumber",
  inputs: [],
  steps: [
    { kind: "note", description: "step 0" },
    {
      kind: "call",
      algoId: "ToPrimitive",
      inputs: [],
      steps: [
        { kind: "note", description: "nested 0" },
        { kind: "return", value: { type: "Number", value: 1 } },
      ],
    },
    { kind: "return", value: { type: "Number", value: 1 } },
  ],
};

describe("flattenTrace", () => {
  it("enumerates every step depth-first with contiguous indices", () => {
    const flat = flattenTrace(tree);
    expect(flat.map((e) => e.index)).toEqual([0, 1, 2, 3, 4]);
  });

  it("emits dotted paths that encode tree position", () => {
    const flat = flattenTrace(tree);
    expect(flat.map((e) => e.path)).toEqual(["0", "1", "1.0", "1.1", "2"]);
  });

  it("carries the owning algo and full call stack for nested steps", () => {
    const flat = flattenTrace(tree);
    const nested = flat.find((e) => e.path === "1.0")!;
    expect(nested.algoId).toBe("ToPrimitive");
    expect(nested.callStack.map((f) => f.algoId)).toEqual(["ToNumber", "ToPrimitive"]);
  });

  it("keeps top-level steps under the root algo only", () => {
    const flat = flattenTrace(tree);
    const top = flat.find((e) => e.path === "0")!;
    expect(top.algoId).toBe("ToNumber");
    expect(top.callStack.map((f) => f.algoId)).toEqual(["ToNumber"]);
  });

  it("handles a root with no steps", () => {
    expect(flattenTrace({ algoId: "ToBoolean", inputs: [], steps: [] })).toEqual([]);
  });
});
