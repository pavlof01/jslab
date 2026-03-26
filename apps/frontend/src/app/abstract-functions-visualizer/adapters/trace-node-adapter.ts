/**
 * Adapter: trace-service TraceNode[] → frontend TraceResult
 *
 * trace-service returns a tree of TraceNode, where:
 *   - TraceNode.steps  = individual steps inside one algorithm call
 *   - TraceNode.children = nested algorithm calls triggered from within
 *
 * The frontend expects TraceResult with flat ExecutedStep[], where nested
 * algorithm calls are attached as nestedTrace on the triggering step.
 */
import type { ExecutedStep, TraceResult } from "@/app/abstract-functions-visualizer/abstract-operations-tracer";

// ─── Types mirroring trace-service responses ────────────────────────────────

export interface TraceServiceStep {
  step: number;
  depth: number;
  kind: "if" | "operation" | "call" | "return" | "throw" | "note";
  hint?: string;
  description?: string;
  value?: string;
  type?: string;
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

const SPEC_URL: Record<string, string> = {
  ToNumber: "https://262.ecma-international.org/#sec-tonumber",
  ToString: "https://262.ecma-international.org/#sec-tostring",
  ToBoolean: "https://262.ecma-international.org/#sec-toboolean",
  ToPrimitive: "https://262.ecma-international.org/#sec-toprimitive",
  OrdinaryToPrimitive: "https://262.ecma-international.org/#sec-ordinarytoprimitive",
  ToNumeric: "https://262.ecma-international.org/#sec-tonumeric",
  ToObject: "https://262.ecma-international.org/#sec-toobject",
  StringToNumber: "https://262.ecma-international.org/#sec-stringtonumber",
};

// ─── Conversion helpers ──────────────────────────────────────────────────────

function stepDescription(s: TraceServiceStep): string {
  return s.hint ?? s.description ?? `Step ${s.step}`;
}

/**
 * Convert a single TraceNode (one algorithm call) into a TraceResult,
 * recursively handling its children.
 */
function nodeToTraceResult(node: TraceServiceNode, input: unknown): TraceResult {
  // Build a map: TraceServiceNode child → which "call" step triggered it.
  // We match by order: sort call-steps by step number, children are in the
  // same order they were pushed during execution.
  const callSteps = node.steps
    .filter((s) => s.kind === "call")
    .sort((a, b) => a.step - b.step);

  const childByCallIndex = new Map<number, TraceResult>();
  node.children.forEach((child, idx) => {
    if (idx < callSteps.length) {
      childByCallIndex.set(callSteps[idx].step, nodeToTraceResult(child, child.inputs[0] ?? undefined));
    }
  });

  const steps: ExecutedStep[] = node.steps.map((s) => {
    const executed = s.kind !== "if" || s.value !== undefined;
    const step: ExecutedStep = {
      kind: s.kind,
      description: stepDescription(s),
      executed,
      result: s.value,
    };
    const nested = childByCallIndex.get(s.step);
    if (nested) step.nestedTrace = nested;
    return step;
  });

  return {
    algorithmId: node.algoId,
    algorithmName: node.algoId,
    algorithmDescription: `ECMAScript abstract operation ${node.algoId}`,
    algorithmUrl: SPEC_URL[node.algoId],
    input,
    output: node.output,
    success: !node.error,
    steps,
    finalValue: node.output,
    error: node.error,
  };
}

/**
 * Convert a full trace-service ExecuteResponse into the frontend TraceResult.
 *
 * The root TraceResult wraps the top-level algorithm; nested calls become
 * nestedTrace on the calling step.
 */
export function traceServiceResponseToTraceResult(response: TraceServiceResponse): TraceResult {
  const rootNode = response.trace[0];

  // No trace nodes — return a minimal result
  if (!rootNode) {
    return {
      algorithmId: response.functionName,
      algorithmName: response.functionName,
      algorithmDescription: `ECMAScript abstract operation ${response.functionName}`,
      algorithmUrl: SPEC_URL[response.functionName],
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
