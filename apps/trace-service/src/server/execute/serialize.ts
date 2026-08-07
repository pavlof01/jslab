/**
 * Serializes engine262 TraceNode/TraceStep trees into a transport-friendly
 * shape with SerializedValue (instead of raw display strings) so the frontend
 * can render the trace tree directly without further parsing.
 *
 * Sub-algorithm invocations are nested inside `kind: "call"` steps via
 * `algoId`, `inputs`, `steps`, `output`, `error` (mirror of the engine262 shape).
 *
 * Two entry points, deliberately different:
 * - `fromEngineValue` for a live engine262 Value (the algorithm's return value) —
 *   the spec type is read off the Value itself and is always exact.
 * - `toSerializedValue` for the display strings the trace recorder already
 *   flattened into steps — recovering a type from those is guesswork, so it must
 *   never be used where a real Value is in hand.
 */
import type { TraceNode, TraceStep, TraceStepKind } from "../../trace/index.mts";
import { ALGO_SPEC_URL } from "../spec-generator.ts";

/**
 * JSON has no literal for NaN/±Infinity and collapses -0 to 0, so those Numbers
 * travel as sentinel strings. The frontend renders a Number payload with
 * `String(value)`, which prints them verbatim.
 */
export type NumberPayload = number | "NaN" | "Infinity" | "-Infinity" | "-0";

export type SerializedValue =
  | { type: "Undefined" }
  | { type: "Null"; value: null }
  | { type: "Boolean"; value: boolean }
  | { type: "Number"; value: NumberPayload }
  | { type: "String"; value: string }
  | { type: "Symbol"; value: { id: string; description?: string } }
  | { type: "BigInt"; value: string }
  | { type: "Object"; value: { id: string; class: string; preview?: string } };

/**
 * Structural view of an engine262 `Value`. Declared locally instead of importing
 * the class union so this module carries no runtime engine262 import and can be
 * unit-tested without the submodule checked out.
 */
export interface EngineValue {
  readonly type: "Undefined" | "Null" | "Boolean" | "String" | "Symbol" | "Number" | "BigInt" | "Object";
  /** Primitive payload on every PrimitiveValue except SymbolValue. */
  readonly value?: unknown;
  /** SymbolValue only: a JSStringValue or UndefinedValue. */
  readonly Description?: { readonly value?: unknown };
  /** ObjectValue only. */
  readonly internalSlotsList?: readonly string[];
}

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

/**
 * Internal slots that identify a primitive wrapper object (what ToObject builds).
 * The slot also holds the wrapped Value, which is safe to read for a preview:
 * unlike Get/toString it cannot re-enter user code.
 */
const WRAPPER_SLOTS: ReadonlyArray<readonly [slot: string, className: string]> = [
  ["NumberData", "Number"],
  ["StringData", "String"],
  ["BooleanData", "Boolean"],
  ["SymbolData", "Symbol"],
  ["BigIntData", "BigInt"],
];

// MAX_SOURCE_LENGTH bounds the *input* text, not what evaluating it produces:
// a short expression like "'a'.repeat(50_000_000)" builds a huge string well
// inside the worker's time and heap budget, and every String/BigInt payload
// (and any preview built from one) embeds the value verbatim. Cap here so a
// cheap request can't turn into a multi-megabyte response — repeated across
// every step of a trace that references the same value.
const MAX_STRING_LENGTH = 10_000;

function capString(s: string, max: number = MAX_STRING_LENGTH): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}… (truncated, ${s.length - max} more chars)`;
}

function numberPayload(n: number): NumberPayload {
  if (Number.isNaN(n)) return "NaN";
  if (n === Infinity) return "Infinity";
  if (n === -Infinity) return "-Infinity";
  if (Object.is(n, -0)) return "-0";
  return n;
}

function previewOfPrimitive(value: SerializedValue): string | undefined {
  switch (value.type) {
    case "String":
      return JSON.stringify(value.value);
    case "Number":
    case "Boolean":
      return String(value.value);
    case "BigInt":
      return `${value.value}n`;
    case "Symbol":
      return value.value.description === undefined ? "Symbol()" : `Symbol(${value.value.description})`;
    default:
      return undefined;
  }
}

function describeObject(value: EngineValue): { id: string; class: string; preview?: string } {
  const slots = value.internalSlotsList ?? [];
  for (const [slot, className] of WRAPPER_SLOTS) {
    if (!slots.includes(slot)) continue;
    const wrapped = (value as unknown as Record<string, EngineValue | undefined>)[slot];
    const preview = wrapped ? previewOfPrimitive(fromEngineValue(wrapped)) : undefined;
    return { id: "obj", class: className, preview };
  }
  if (slots.includes("Call")) return { id: "obj", class: "Function" };
  // A response carries exactly one result Value, so a constant id is enough to
  // identify it; engine262 objects have no stable identity to expose anyway.
  return { id: "obj", class: "Object" };
}

/**
 * Serializes a live engine262 Value by its spec type.
 *
 * This replaces an older Value → display string → re-parse round trip that lost
 * the type: ToString(true) came back as the Boolean true rather than the String
 * "true", and ToString(42) as the Number 42 — exactly the confusion this tool
 * exists to dispel.
 */
export function fromEngineValue(value: EngineValue): SerializedValue {
  switch (value.type) {
    case "Undefined":
      return { type: "Undefined" };
    case "Null":
      return { type: "Null", value: null };
    case "Boolean":
      return { type: "Boolean", value: value.value === true };
    case "String":
      return { type: "String", value: capString(typeof value.value === "string" ? value.value : String(value.value ?? "")) };
    case "Number":
      return { type: "Number", value: numberPayload(Number(value.value)) };
    case "BigInt":
      return { type: "BigInt", value: capString(String(value.value)) };
    case "Symbol": {
      const description = value.Description?.value;
      return {
        type: "Symbol",
        value: { id: "sym", description: typeof description === "string" ? capString(description) : undefined },
      };
    }
    case "Object":
      return { type: "Object", value: describeObject(value) };
  }
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
  if (/^-?\d+n$/.test(str)) return { type: "BigInt", value: capString(str.slice(0, -1)) };
  if ((str.startsWith("{") && str.endsWith("}")) || (str.startsWith("[") && str.endsWith("]"))) {
    return { type: "Object", value: { id: "display", class: "", preview: capString(str) } };
  }
  if (str.startsWith('"') && str.endsWith('"') && str.length >= 2) {
    return { type: "String", value: capString(str.slice(1, -1)) };
  }
  // Numeric literal (e.g. "+0", "-0", "42", "3.14")
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(str)) {
    const n = Number(str);
    if (!Number.isNaN(n)) return { type: "Number", value: n };
  }
  return { type: "String", value: capString(str) };
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
