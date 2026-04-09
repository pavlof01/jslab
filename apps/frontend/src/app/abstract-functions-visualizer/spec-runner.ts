// spec-runner.ts (UPDATED)
// - Adds call-site transitions (so coercion animates at `let ny = ToNumber(y)`)
// - Emits concat/add transitions for ConcatStrings/AddNumbers at the return site (nice UI)
//
// Drop-in replacement for the previous file.

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
  | { type: "Undefined"; value: undefined }
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

export type VarExpr = { var: string };
export type LitExpr = { lit: SpecValue };
export type OpExpr = { op: string; args?: Expr[] };
export type CallExpr = { op: "call"; algo: string; args: Expr[] };
export type IfExpr = { op: "ifExpr"; cond: Expr; then: Expr; else: Expr };
export type Expr = VarExpr | LitExpr | OpExpr | CallExpr | IfExpr;

export type UIHint = {
  markAsCoercion?: boolean;
  label?: string;
  explain?: string;
};

export type InstrMeta = {
  ui?: UIHint;
  // Top-level spec step number (e.g. 1..N) for stable mapping to spec reference text.
  // Optional and backward-compatible: older catalogs simply omit it.
  specStep?: number;
};

export type LetInstr = {
  op: "let";
  name: string;
  expr: Expr;
  hint?: string;
  meta?: InstrMeta;
};

export type IfInstr = {
  op: "if";
  cond: Expr;
  then: Instr[];
  else: Instr[];
  hint?: string;
  meta?: InstrMeta;
};

export type ReturnInstr = {
  op: "return";
  expr: Expr;
  hint?: string;
  meta?: InstrMeta;
};

export type Instr = LetInstr | IfInstr | ReturnInstr;

export type Algorithm = {
  id: string;
  title?: string;
  params: string[];
  locals?: string[];
  body: Instr[];
};

export type Catalog = {
  algorithms: Algorithm[];
  intrinsics: Record<string, { args?: string[]; returns?: string; impl?: string }>;
};

export type TraceTransition =
  | {
      kind: "coercion";
      op: string;
      from: SpecValue;
      to: SpecValue;
      why: string;
      label?: string;
    }
  | {
      kind: "concat";
      op: "+";
      from: [SpecValue, SpecValue];
      to: SpecValue;
      why: string;
    }
  | {
      kind: "add";
      op: "+";
      from: [SpecValue, SpecValue];
      to: SpecValue;
      why: string;
    };

type NestedTraceInfo = {
  algorithmName: string;
  algorithmId: string;
  input: SpecValue;
  output?: SpecValue;
  steps: TraceStep[];
};

export type TraceStep =
  | {
      stepId: number;
      kind: "call";
      fromAlgo?: string;
      toAlgo: string;
      args: SpecValue[];
      result?: SpecValue;
      stack: string[];
      frameId?: string;
      parentFrameId?: string;
    }
  | {
      stepId: number;
      kind: "ret";
      fromAlgo: string;
      value: SpecValue;
      stack: string[];
      frameId?: string;
      parentFrameId?: string;
    }
  | {
      stepId: number;
      kind: "let";
      algoId: string;
      nodePath: (number | string)[];
      hint?: string;
      specStep?: number;
      envDelta: Record<string, SpecValue>;
      transitions?: TraceTransition[];
      nestedTrace?: NestedTraceInfo;
      stack: string[];
      frameId?: string;
      parentFrameId?: string;
      varName?: string;
    }
  | {
      stepId: number;
      kind: "if";
      algoId: string;
      nodePath: (number | string)[];
      hint?: string;
      specStep?: number;
      condPretty?: string;
      decision: { taken: "then" | "else"; why: string };
      nestedTrace?: NestedTraceInfo;
      stack: string[];
      frameId?: string;
      parentFrameId?: string;
    }
  | {
      stepId: number;
      kind: "return";
      algoId: string;
      nodePath: (number | string)[];
      hint?: string;
      specStep?: number;
      value: SpecValue;
      transitions?: TraceTransition[];
      nestedTrace?: NestedTraceInfo;
      stack: string[];
      frameId?: string;
      parentFrameId?: string;
    };
