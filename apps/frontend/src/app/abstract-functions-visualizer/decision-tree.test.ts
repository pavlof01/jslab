import { describe, expect, it } from "@jest/globals";

import { buildDecisionTree } from "./decision-tree";
import type { TraceNode } from "./spec-runner";

const root = (steps: TraceNode["steps"]): TraceNode =>
  ({
    algoId: "ToNumber",
    inputs: [],
    output: undefined,
    steps,
  }) as unknown as TraceNode;

describe("buildDecisionTree", () => {
  it("keeps short clause ids in the citation column and gives each test its own stop", () => {
    const nodes = buildDecisionTree(
      root([
        { kind: "if", taken: true, hint: "3.b.ii", description: "argument is a String" },
        { kind: "if", taken: false, hint: "4", description: "argument is a Symbol" },
      ] as TraceNode["steps"]),
    );
    expect(nodes[0].tests).toEqual([
      { taken: true, clause: "3.b.ii", label: "argument is a String", index: 0 },
      { taken: false, clause: "4", label: "argument is a Symbol", index: 1 },
    ]);
  });

  it("drops sentence-length hints from the citation column but keeps them as the label fallback", () => {
    const hint = "Step 1: Type(x) is Object, Type(y) is Boolean — different types, continue.";
    const nodes = buildDecisionTree(root([{ kind: "if", taken: false, hint } as never]));
    expect(nodes[0].tests[0].clause).toBe("");
    expect(nodes[0].tests[0].label).toBe(hint);
  });

  it("numbers steps in flat-entry order so playback and selection line up", () => {
    const nodes = buildDecisionTree(
      root([
        { kind: "if", taken: true, hint: "1", description: "first" },
        {
          kind: "call",
          algoId: "ToPrimitive",
          inputs: [],
          output: undefined,
          steps: [{ kind: "return", description: "done" }],
        },
      ] as never),
    );
    expect(nodes.map((n) => n.op)).toEqual(["ToNumber", "ToPrimitive"]);
    // Flat entries: 0 = the `if`, 1 = the call step, 2 = the child's first
    // inner step. The child frame's header answers to the call step — the
    // moment the frame opens — and its return is its own stop after that.
    expect(nodes[1].index).toBe(1);
    expect(nodes[1].actionIndex).toBe(2);
  });
});
