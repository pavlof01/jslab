import type { CallStackFrame, TraceNode, TraceStep } from "./spec-runner";

export type FlatEntry = {
  index: number;
  /** Dotted path through the tree (e.g. "0.2.1" = step 1 inside step 0 inside step 2). */
  path: string;
  step: TraceStep;
  algoId: string;
  /** Stack of algorithms from root down to (and including) the owning algo. */
  callStack: CallStackFrame[];
};

export function flattenTrace(root: TraceNode): FlatEntry[] {
  const out: FlatEntry[] = [];
  let idx = 0;

  function walk(node: TraceNode, callStack: CallStackFrame[], pathPrefix: string): void {
    const stack = [...callStack, { algoId: node.algoId, specUrl: node.specUrl }];
    node.steps.forEach((step, i) => {
      const path = pathPrefix ? `${pathPrefix}.${i}` : String(i);
      out.push({ index: idx++, path, step, algoId: node.algoId, callStack: stack });
      if (step.kind === "call" && step.algoId && step.steps) {
        walk(
          {
            algoId: step.algoId,
            inputs: step.inputs ?? [],
            output: step.output,
            error: step.error,
            steps: step.steps,
            specUrl: step.specUrl,
          },
          stack,
          path,
        );
      }
    });
  }

  walk(root, [], "");
  return out;
}
