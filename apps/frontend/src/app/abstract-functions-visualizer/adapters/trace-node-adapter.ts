/**
 * Adapter: trace-service TraceNode[] → frontend TraceResult
 *
 * trace-service returns a raw tree of TraceNode, where:
 *   - TraceNode.steps  = individual steps inside one algorithm call
 *   - TraceNode.children = nested algorithm calls triggered from within
 *
 * The frontend expects TraceResult with flat ExecutedStep[], where nested
 * algorithm calls are attached as nestedTrace on the triggering step.
 */
import type { ExecutedStep, TraceResult } from "@/app/abstract-functions-visualizer/abstract-operations-tracer";

// ─── Types mirroring trace-service TraceNode / TraceStep ────────────────────

export interface TraceServiceStep {
  step: number;
  depth: number;
  kind: "if" | "operation" | "call" | "return" | "throw" | "note";
  hint?: string;
  description?: string;
  value?: string;
  output?: string;
  type?: string;
  specOrder?: number;
  taken?: boolean;
  varName?: string;
}

export interface TraceServiceNode {
  step: number;
  depth: number;
  algoId: string;
  inputs: string[];
  output?: string;
  error?: string;
  steps: TraceServiceStep[];
  children: TraceServiceNode[];
}

export interface TraceServiceResponse {
  success: boolean;
  functionName: string;
  resultValue: string;
  resultType: string;
  trace: TraceServiceNode[];
  stepCount: number;
  error?: string;
}

// ─── Spec URLs ───────────────────────────────────────────────────────────────

export const ALGO_SPEC_URL: Record<string, string> = {
  ToNumber: "https://262.ecma-international.org/#sec-tonumber",
  ToString: "https://262.ecma-international.org/#sec-tostring",
  ToBoolean: "https://262.ecma-international.org/#sec-toboolean",
  ToPrimitive: "https://262.ecma-international.org/#sec-toprimitive",
  OrdinaryToPrimitive: "https://262.ecma-international.org/#sec-ordinarytoprimitive",
  ToNumeric: "https://262.ecma-international.org/#sec-tonumeric",
  ToObject: "https://262.ecma-international.org/#sec-toobject",
  ToPropertyKey: "https://262.ecma-international.org/#sec-topropertykey",
  ToLength: "https://262.ecma-international.org/#sec-tolength",
  ToIndex: "https://262.ecma-international.org/#sec-toindex",
  StringToNumber: "https://262.ecma-international.org/#sec-stringtonumber",
  GetMethod: "https://262.ecma-international.org/#sec-getmethod",
  GetV: "https://262.ecma-international.org/#sec-getv",
  Get: "https://262.ecma-international.org/#sec-get-o-p",
  Call: "https://262.ecma-international.org/#sec-call",
};

// ─── Conversion ──────────────────────────────────────────────────────────────

function stepDescription(s: TraceServiceStep): string {
  return s.hint ?? s.description ?? `Step ${s.step}`;
}

function nodeToTraceResult(node: TraceServiceNode, input: unknown): TraceResult {
  // Map nth call-step (by step number order) to nth child node
  const callSteps = node.steps
    .filter((s) => s.kind === "call")
    .sort((a, b) => a.step - b.step);

  const childByCallIndex = new Map<number, TraceResult>();
  node.children.forEach((child, idx) => {
    if (idx < callSteps.length) {
      childByCallIndex.set(callSteps[idx].step, nodeToTraceResult(child, child.inputs[0] ?? undefined));
    }
  });

  // Sort steps by specOrder when present.
  // Steps without specOrder keep their original position (stable sort).
  // return/throw always stay at the end regardless of specOrder.
  const sortedSteps = [...node.steps].sort((a, b) => {
    const terminal = (s: TraceServiceStep) => s.kind === "return" || s.kind === "throw";
    if (terminal(a) && !terminal(b)) return 1;
    if (!terminal(a) && terminal(b)) return -1;
    if (a.specOrder !== undefined && b.specOrder !== undefined) return a.specOrder - b.specOrder;
    if (a.specOrder !== undefined) return -1;
    if (b.specOrder !== undefined) return 1;
    return 0;
  });

  const steps: ExecutedStep[] = sortedSteps.map((s) => {
    const executed =
      s.kind !== "if" || (s.taken !== undefined ? s.taken : s.value !== undefined);
    const step: ExecutedStep = {
      kind: s.kind,
      description: stepDescription(s),
      executed,
      result: s.output ?? s.value ?? (s.kind === "return" ? node.output : undefined),
      varName: s.varName,
    };
    const nested = childByCallIndex.get(s.step);
    if (nested) step.nestedTrace = nested;
    return step;
  });

  return {
    algorithmId: node.algoId,
    algorithmName: node.algoId,
    algorithmDescription: `ECMAScript abstract operation ${node.algoId}`,
    algorithmUrl: ALGO_SPEC_URL[node.algoId],
    input,
    output: node.output,
    success: !node.error,
    steps,
    finalValue: node.output,
    error: node.error,
  };
}

/**
 * Convert a full trace-service response into the frontend TraceResult.
 */
export function traceServiceResponseToTraceResult(response: TraceServiceResponse): TraceResult {
  const rootNode = response.trace[0];

  if (!rootNode) {
    return {
      algorithmId: response.functionName,
      algorithmName: response.functionName,
      algorithmDescription: `ECMAScript abstract operation ${response.functionName}`,
      algorithmUrl: ALGO_SPEC_URL[response.functionName],
      input: undefined,
      output: response.resultValue,
      success: response.success,
      steps: [],
      finalValue: response.resultValue,
      error: response.error,
    };
  }

  const result = nodeToTraceResult(rootNode, rootNode.inputs[0] ?? undefined);
  return {
    ...result,
    output: response.resultValue,
    finalValue: response.resultValue,
    success: response.success,
    error: response.error ?? result.error,
  };
}
