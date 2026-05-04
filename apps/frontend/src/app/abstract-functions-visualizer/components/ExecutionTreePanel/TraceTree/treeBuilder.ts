import type { TraceStep, SpecValue } from "@/app/abstract-functions-visualizer/spec-runner";

export type StepNode = {
  kind: "step";
  step: TraceStep;
  traceIndex: number;
};

export type CallNode = {
  kind: "call";
  algoId: string;
  specUrl?: string;
  args: SpecValue[];
  returnValue?: SpecValue;
  /** Depth of direct children of this block. */
  ownsDepth: number;
  /** Index of the originating "call" step in the original flat trace. Used as collapse key. */
  callStepIndex: number;
  children: TreeNode[];
};

export type TreeNode = StepNode | CallNode;

export function buildCallTree(steps: TraceStep[]): CallNode {
  const minDepth = steps.reduce((m, s) => Math.min(m, s.depth), Infinity);
  const safeMin = isFinite(minDepth) ? minDepth : 0;

  const root: CallNode = {
    kind: "call",
    algoId: steps[0]?.callStack[0]?.algoId ?? "—",
    args: [],
    ownsDepth: safeMin,
    callStepIndex: -1,
    children: [],
  };

  const stack: CallNode[] = [root];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    while (stack.length > 1 && stack[stack.length - 1].ownsDepth > step.depth) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];

    if (step.kind === "call") {
      const node: CallNode = {
        kind: "call",
        algoId: step.toAlgo,
        specUrl: step.specUrl,
        args: step.args,
        returnValue: step.result,
        ownsDepth: step.depth + 1,
        callStepIndex: i,
        children: [],
      };
      parent.children.push(node);
      stack.push(node);
    } else if (step.kind === "let" && step.callStep) {
      // let + call merged pair: show the let row, then group sub-algo steps in a CallNode
      parent.children.push({ kind: "step", step, traceIndex: i });
      const returnValue = Object.values(step.envDelta ?? {})[0];
      const node: CallNode = {
        kind: "call",
        algoId: step.callStep.toAlgo,
        specUrl: step.callStep.specUrl,
        args: step.callStep.args,
        returnValue,
        ownsDepth: step.depth + 1,
        callStepIndex: i,
        children: [],
      };
      parent.children.push(node);
      stack.push(node);
    } else {
      parent.children.push({ kind: "step", step, traceIndex: i });
    }
  }

  return root;
}

export function treeContainsIndex(node: CallNode, index: number): boolean {
  for (const child of node.children) {
    if (child.kind === "step" && child.traceIndex === index) return true;
    if (child.kind === "call" && treeContainsIndex(child, index)) return true;
  }
  return false;
}

export function countSteps(node: CallNode): number {
  let count = 0;
  for (const child of node.children) {
    if (child.kind === "step") count++;
    else count += countSteps(child);
  }
  return count;
}
