/**
 * Adapter to convert ExecutedStep from executors to TraceStep format
 * This allows new executors to work with existing UI components
 */

import type { ExecutedStep, TraceResult } from "@/app/coercion-visualizer/algorithms/executors";
import type { TraceStep, SpecValue } from "@/app/coercion-visualizer/spec-runner";

/**
 * Convert ExecutedStep to TraceStep format
 */
export function executedStepToTraceStep(step: ExecutedStep, index: number, algoId: string): TraceStep {
  const base = {
    stepId: index,
    algoId,
    stack: [algoId],
    frameId: algoId,
  };

  if (step.executed) {
    if (step.kind === "return") {
      return {
        ...base,
        kind: "return",
        nodePath: [index],
        value: valueToSpecValue(step.result),
        hint: step.description,
      };
    }

    // For other executed steps, treat as "let" (assignment/computation)
    return {
      ...base,
      kind: "let",
      nodePath: [index],
      hint: step.description,
      envDelta: {
        [step.description]: valueToSpecValue(step.result),
      },
    };
  } else {
    // Skipped step - still include as "if" that was not taken
    return {
      ...base,
      kind: "if",
      nodePath: [index],
      hint: step.description,
      condPretty: step.description,
      decision: {
        taken: "else" as const,
        why: step.reason || "Condition not met",
      },
    };
  }
}

/**
 * Convert TraceResult to array of TraceStep
 */
export function traceResultToTraceSteps(trace: TraceResult): TraceStep[] {
  const steps: TraceStep[] = [];

  // Add entry point
  steps.push({
    stepId: 0,
    kind: "call",
    toAlgo: trace.algorithmName,
    args: [valueToSpecValue(trace.input)],
    stack: [trace.algorithmName],
    frameId: trace.algorithmName,
  } as TraceStep);

  // Add all steps
  let stepIndex = 1;
  for (const step of trace.steps) {
    const traceStep = executedStepToTraceStep(step, stepIndex, trace.algorithmName);
    steps.push(traceStep);
    stepIndex++;
  }

  // Add return step
  if (trace.output !== undefined) {
    steps.push({
      stepId: stepIndex,
      kind: "ret",
      fromAlgo: trace.algorithmName,
      value: valueToSpecValue(trace.output),
      stack: [trace.algorithmName],
      frameId: trace.algorithmName,
    } as TraceStep);
  }

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
        id: `obj_${Math.random().toString(36).substr(2, 9)}`,
        class: className,
        preview: String(value),
      } as { id: string; class: string; preview?: string; [k: string]: unknown },
    };
  }

  // Default to Null for unknown types
  return { type: "Null", value: null };
}
