import type { TraceNode, TraceStep } from "./spec-runner";
import { formatSpecValue } from "./traceModel";

export type DecisionTest = {
  taken: boolean;
  clause: string;
  label: string;
  /** This test's own stop in the flat step enumeration. */
  index: number;
};

export type DecisionNode = {
  /** Stable key: the node's path through the tree. */
  path: string;
  /** Index into the flat step enumeration, for playback and selection. */
  index: number;
  depth: number;
  op: string;
  args: string;
  result?: string;
  tests: DecisionTest[];
  action?: string;
  /** The action's stop in the flat enumeration; the frame's own last step. */
  actionIndex?: number;
};

function label(step: TraceStep): string {
  return step.description ?? step.hint ?? step.kind;
}

export function buildDecisionTree(root: TraceNode): DecisionNode[] {
  const out: DecisionNode[] = [];
  let index = 0;

  function walkCall(
    algoId: string,
    inputs: TraceNode["inputs"],
    output: TraceNode["output"],
    steps: TraceStep[],
    depth: number,
    path: string,
    headerIndex?: number,
  ): void {
    const node: DecisionNode = {
      path,
      index: headerIndex ?? index,
      depth,
      op: algoId,
      args: inputs.map((v) => formatSpecValue(v, Number.POSITIVE_INFINITY)).join(", "),
      result: output ? formatSpecValue(output, Number.POSITIVE_INFINITY) : undefined,
      tests: [],
      action: undefined,
    };
    out.push(node);

    steps.forEach((step, i) => {
      const stepPath = path ? `${path}.${i}` : String(i);
      const stepIndex = index++;

      if (step.kind === "if") {
        const hint = step.hint ?? "";
        const cited = /^Step (\d+(?:[a-z](?:-[a-zA-Z0-9]+)?)?):?\s*/i.exec(hint);
        const clause = cited ? cited[1] : hint.length <= 8 && !hint.includes(" ") ? hint : "";
        node.tests.push({
          taken: step.taken === true,
          clause,
          label: step.description ?? (cited ? hint.slice(cited[0].length) : hint),
          index: stepIndex,
        });
        return;
      }

      if (step.kind === "return" || step.kind === "throw") {
        const value = step.value
          ? formatSpecValue(step.value, Number.POSITIVE_INFINITY)
          : undefined;
        node.action = value ? `${label(step)} → ${value}` : label(step);
        node.actionIndex = stepIndex;
        return;
      }

      if (step.kind === "call" && step.algoId) {
        walkCall(
          step.algoId,
          step.inputs ?? [],
          step.output,
          step.steps ?? [],
          depth + 1,
          stepPath,
          stepIndex,
        );
        return;
      }

      if (!node.action) {
        node.action = label(step);
        node.actionIndex = stepIndex;
      }
    });
  }

  walkCall(root.algoId, root.inputs, root.output, root.steps, 0, "");
  return out;
}
