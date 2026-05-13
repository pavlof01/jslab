// Trace types — mirror the SerializedTraceNode/Step shape produced by the
// trace-service backend. Sub-algorithm invocations are nested inside
// `kind: "call"` steps via `algoId`, `inputs`, `steps`, `output`, `error`.

export type TypeTag =
  | "Undefined"
  | "Null"
  | "Boolean"
  | "Number"
  | "String"
  | "Object"
  | "Symbol"
  | "BigInt"
  | "Array"
  | "TypeTag";

export type SpecValue =
  | { type: "Undefined"; value?: undefined }
  | { type: "Null"; value: null }
  | { type: "Boolean"; value: boolean }
  | { type: "Number"; value: number | "NaN" }
  | { type: "String"; value: string }
  | { type: "Symbol"; value: { id: string; description?: string } }
  | { type: "BigInt"; value: string }
  | {
      type: "Object";
      value: { id: string; class: string; preview?: string; [k: string]: unknown };
    }
  | { type: "Array"; value: unknown[] }
  | { type: "TypeTag"; value: TypeTag };

export type TraceStepKind =
  | "if"
  | "operation"
  | "call"
  | "return"
  | "throw"
  | "assert"
  | "note";

export interface TraceStep {
  kind: TraceStepKind;
  hint?: string;
  description?: string;
  taken?: boolean;
  /** Output of plain steps (let/operation/assert/note). */
  result?: SpecValue;
  /** kind === "return" only. */
  value?: SpecValue;
  /** kind === "call" only — invoked sub-algorithm metadata. */
  algoId?: string;
  inputs?: SpecValue[];
  output?: SpecValue;
  error?: string;
  steps?: TraceStep[];
  specUrl?: string;
}

export interface TraceNode {
  algoId: string;
  inputs: SpecValue[];
  output?: SpecValue;
  error?: string;
  steps: TraceStep[];
  specUrl?: string;
}

export type CallStackFrame = { algoId: string; specUrl?: string };
