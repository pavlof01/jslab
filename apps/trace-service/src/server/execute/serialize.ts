/**
 * Serializes engine262 TraceNode/TraceStep trees into a transport-friendly
 * shape with SerializedValue (instead of raw display strings) so the frontend
 * can render the trace tree directly without further parsing.
 *
 * Sub-algorithm invocations are nested inside `kind: "call"` steps via
 * `algoId`, `inputs`, `steps`, `output`, `error` (mirror of the engine262 shape).
 */
import type { TraceNode, TraceStep, TraceStepKind } from "../../trace/index.mts";
import { ALGO_SPEC_URL } from "../spec-generator.ts";

export type SerializedValue =
  | { type: "Undefined" }
  | { type: "Null"; value: null }
  | { type: "Boolean"; value: boolean }
  | { type: "Number"; value: number | "NaN" }
  | { type: "String"; value: string }
  | { type: "Symbol"; value: { id: string; description?: string } }
  | { type: "BigInt"; value: string }
  | { type: "Object"; value: { id: string; class: string; preview?: string } };

export interface SerializedTraceStep {
  kind: TraceStepKind;
  hint?: string;
  description?: string;
  taken?: boolean;
  /** "Output" of plain steps (let/operation): present if engine produced one. */
  result?: SerializedValue;
  /** kind === "return" only. */
  value?: SerializedValue;
  /** kind === "call" only — invoked sub-algorithm metadata. */
  algoId?: string;
  inputs?: SerializedValue[];
  output?: SerializedValue;
  error?: string;
  steps?: SerializedTraceStep[];
  specUrl?: string;
}

export interface SerializedTraceNode {
  algoId: string;
  inputs: SerializedValue[];
  output?: SerializedValue;
  error?: string;
  steps: SerializedTraceStep[];
  specUrl?: string;
}

export function toSerializedValue(str: string | undefined): SerializedValue {
  if (str === undefined) return { type: "Undefined" };
  if (str === "null") return { type: "Null", value: null };
  if (str === "true") return { type: "Boolean", value: true };
  if (str === "false") return { type: "Boolean", value: false };
  if (str === "NaN") return { type: "Number", value: "NaN" };
  if (str === "undefined") return { type: "Undefined" };
  if (str === "Object") return { type: "Object", value: { id: "obj", class: "Object" } };
  if (str === "Number") return { type: "Number", value: "NaN" };
  if (str === "String") return { type: "String", value: "" };
  if (str === "Boolean") return { type: "Boolean", value: false };
  if (str === "Null") return { type: "Null", value: null };
  if (str === "Undefined") return { type: "Undefined" };
  if (str === "Symbol") return { type: "Symbol", value: { id: "sym" } };
  if (str === "BigInt") return { type: "BigInt", value: "0" };
  if (/^-?\d+n$/.test(str)) return { type: "BigInt", value: str.slice(0, -1) };
  if ((str.startsWith("{") && str.endsWith("}")) || (str.startsWith("[") && str.endsWith("]"))) {
    return { type: "Object", value: { id: "display", class: "", preview: str } };
  }
  if (str.startsWith('"') && str.endsWith('"') && str.length >= 2) {
    return { type: "String", value: str.slice(1, -1) };
  }
  // Numeric literal (e.g. "+0", "-0", "42", "3.14")
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(str)) {
    const n = Number(str);
    if (!Number.isNaN(n)) return { type: "Number", value: n };
  }
  return { type: "String", value: str };
}

function mapInputs(inputs: readonly string[] | undefined): SerializedValue[] {
  return (inputs ?? []).map(toSerializedValue);
}

export function serializeStep(step: TraceStep): SerializedTraceStep {
  const out: SerializedTraceStep = {
    kind: step.kind,
    hint: step.hint,
    description: step.description,
  };

  if (step.kind === "if") {
    out.taken = step.taken;
  } else if (step.kind === "return") {
    out.value = toSerializedValue(step.output ?? step.value);
  } else if (step.kind === "operation") {
    const v = step.output ?? step.value;
    if (v !== undefined) out.result = toSerializedValue(v);
  } else if (step.kind === "call" && step.algoId) {
    out.algoId = step.algoId;
    out.inputs = mapInputs(step.inputs);
    if (step.output !== undefined) out.output = toSerializedValue(step.output);
    if (step.error !== undefined) out.error = step.error;
    if (step.steps) out.steps = step.steps.map(serializeStep);
    out.specUrl = ALGO_SPEC_URL[step.algoId];
  }

  return out;
}

export function serializeNode(node: TraceNode): SerializedTraceNode {
  return {
    algoId: node.algoId,
    inputs: mapInputs(node.inputs),
    output: node.output !== undefined ? toSerializedValue(node.output) : undefined,
    error: node.error,
    steps: node.steps.map(serializeStep),
    specUrl: ALGO_SPEC_URL[node.algoId],
  };
}
