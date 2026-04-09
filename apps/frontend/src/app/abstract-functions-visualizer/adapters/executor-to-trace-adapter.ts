/**
 * Adapter to convert ExecutedStep from executors to TraceStep format
 * This allows new executors to work with existing UI components
 */

import type { TraceStep, SpecValue } from "@/app/abstract-functions-visualizer/spec-runner";
import type { TraceResult } from "../abstract-operations-tracer";

/**
 * Recursively inline a TraceResult into a flat TraceStep[].
 * Nested algorithm calls get proper call/ret boundaries so framesByStep tracks depth.
 */
let _frameCounter = 0;

function inlineTrace(
  trace: TraceResult,
  parentFrameId: string | undefined,
  steps: TraceStep[],
): void {
  const frameId = `${trace.algorithmId}_${_frameCounter++}`;

  steps.push({
    stepId: steps.length,
    kind: "call",
    fromAlgo: parentFrameId,
    toAlgo: trace.algorithmName,
    args: [valueToSpecValue(trace.input)],
    result: trace.output !== undefined ? valueToSpecValue(trace.output) : undefined,
    stack: [],
    frameId,
    parentFrameId,
  } as TraceStep);

  for (const step of trace.steps) {
    const base = {
      stepId: steps.length,
      algoId: trace.algorithmId,
      stack: [],
      frameId,
      nodePath: [steps.length] as (number | string)[],
    };

    let traceStep: TraceStep;
    if (step.executed) {
      if (step.kind === "return") {
        traceStep = {
          ...base,
          kind: "return",
          value: valueToSpecValue(step.result),
          hint: step.description,
        } as TraceStep;
      } else {
        // Only include envDelta when the step actually produced a result value.
        // Note/assert/call steps have no result — omitting keeps the card clean.
        const hasResult = step.result !== undefined;
        traceStep = {
          ...base,
          kind: "let",
          hint: step.description,
          envDelta: hasResult ? { result: valueToSpecValue(step.result) } : {},
          varName: step.varName,
        } as TraceStep;
      }
    } else {
      traceStep = {
        ...base,
        kind: "if",
        hint: step.description,
        condPretty: step.description,
        decision: { taken: "else" as const, why: step.reason || "Condition not met" },
      } as TraceStep;
    }

    steps.push(traceStep);

    // Inline nested trace immediately after the triggering step
    if (step.nestedTrace) {
      inlineTrace(step.nestedTrace, frameId, steps);
    }
  }

  steps.push({
    stepId: steps.length,
    kind: "ret",
    fromAlgo: trace.algorithmName,
    value: valueToSpecValue(trace.output),
    stack: [],
    frameId,
  } as TraceStep);
}

/**
 * Convert TraceResult to a flat TraceStep[].
 * Nested algorithm calls are inlined in execution order so each step is individually
 * steppable via playback, and framesByStep tracks correct nesting depth.
 */
export function traceResultToTraceSteps(trace: TraceResult): TraceStep[] {
  _frameCounter = 0;
  const steps: TraceStep[] = [];
  inlineTrace(trace, undefined, steps);
  return steps;
}

/**
 * Convert any value to SpecValue format
 */
function valueToSpecValue(value: unknown): SpecValue {
  if (value === null) {
    return { type: "Null", value: null };
  }

  if (value === undefined) {
    return { type: "Undefined", value: undefined };
  }

  if (typeof value === "boolean") {
    return { type: "Boolean", value };
  }

  if (typeof value === "number") {
    return { type: "Number", value };
  }

  if (typeof value === "string") {
    // Type-name strings emitted by trace-builder when no input string is available
    // (e.g. "Object", "Number") should be rendered as a typed placeholder, not as
    // a JS string literal.
    if (value === "Object") return { type: "Object", value: { id: "obj", class: "Object" } };
    if (value === "Number") return { type: "Number", value: NaN };
    if (value === "String") return { type: "String", value: "" };
    if (value === "Boolean") return { type: "Boolean", value: false };
    if (value === "Null") return { type: "Null", value: null };
    if (value === "Undefined") return { type: "Undefined", value: undefined };
    if (value === "Symbol") return { type: "Symbol", value: { id: "sym", description: undefined } };
    if (value === "BigInt") return { type: "BigInt", value: "0" };
    // Object display strings from valueToDisplayString (e.g. "{ valueOf: () => ... }")
    // — render without quotes as an object preview.
    if (value.startsWith("{") && value.endsWith("}")) {
      return { type: "Object", value: { id: "display", class: "", preview: value } };
    }
    // valueToDisplayString wraps JS strings in double quotes: "hello" → `"hello"`.
    // Unwrap to store the raw string value so formatSpecValue can re-wrap cleanly.
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      return { type: "String", value: value.slice(1, -1) };
    }
    return { type: "String", value };
  }

  if (typeof value === "symbol") {
    return {
      type: "Symbol",
      value: {
        id: String(value),
        description: value.description,
      } as { id: string; description?: string },
    };
  }

  if (typeof value === "bigint") {
    return { type: "BigInt", value: String(value) };
  }

  if (typeof value === "object") {
    const className = value?.constructor?.name || "Object";
    return {
      type: "Object",
      value: {
        id: `obj_${Math.random().toString(36).slice(2, 11)}`,
        class: className,
        preview: String(value),
      } as { id: string; class: string; preview?: string; [k: string]: unknown },
    };
  }

  // Default to Null for unknown types
  return { type: "Null", value: null };
}
