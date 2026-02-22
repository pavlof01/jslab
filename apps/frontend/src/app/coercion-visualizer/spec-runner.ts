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

export type IntrinsicImpl = (args: SpecValue[]) => SpecValue;

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

export type NestedTraceInfo = {
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

type WithoutStepId<T> = T extends any ? Omit<T, "stepId"> : never;
type TraceStepWithoutId = WithoutStepId<TraceStep>;

type Env = Record<string, SpecValue>;

type ExecResult = { kind: "return"; value: SpecValue } | { kind: "continue" };

type RunnerOptions = {
  autoTransitions?: boolean;
  coercionAlgos?: string[];
};

type EvalMeta = {
  // If the expression was a call to a known coercion algo and type changed,
  // we attach the transition to the *caller instruction* (call-site).
  callSiteTransitions?: TraceTransition[];
};

export class SpecRunner {
  private algos: Map<string, Algorithm>;
  private intrinsics: Record<string, IntrinsicImpl>;
  private steps: TraceStep[] = [];
  private stepId = 0;
  private stack: string[] = [];
  private frameStack: string[] = [];
  private frameIdCounter = 0;
  private opts: Required<RunnerOptions>;

  constructor(catalog: Catalog, intrinsicImpls: Record<string, IntrinsicImpl>, opts?: RunnerOptions) {
    this.algos = new Map(catalog.algorithms.map((a) => [a.id, a]));
    this.intrinsics = intrinsicImpls;
    this.opts = {
      autoTransitions: opts?.autoTransitions ?? true,
      coercionAlgos: opts?.coercionAlgos ?? ["ToNumber", "ToString", "ToPrimitive", "OrdinaryToPrimitive"],
    };
  }

  run(entryAlgo: string, args: SpecValue[]) {
    this.steps = [];
    this.stepId = 0;
    this.stack = [];
    this.frameStack = [];
    this.frameIdCounter = 0;

    const entryFrameId = this.newFrameId();

    this.pushStep({
      kind: "call",
      toAlgo: entryAlgo,
      args,
      stack: [entryAlgo],
      frameId: entryFrameId,
    });

    const value = this.callAlgo(entryAlgo, args, entryFrameId);

    this.pushStep({
      kind: "ret",
      fromAlgo: entryAlgo,
      value,
      stack: [],
      frameId: entryFrameId,
    });

    return { value, trace: this.steps };
  }

  private callAlgo(algoId: string, args: SpecValue[], frameId: string): SpecValue {
    const algo = this.algos.get(algoId);
    if (!algo) throw new Error(`Unknown algorithm: ${algoId}`);

    this.stack.push(algoId);
    this.frameStack.push(frameId);

    const env: Env = Object.create(null);
    for (let i = 0; i < algo.params.length; i++) {
      env[algo.params[i]] = args[i];
    }
    for (const local of algo.locals ?? []) {
      if (!(local in env)) env[local] = { type: "Undefined", value: undefined };
    }

    const res = this.execBlock(algoId, algo.body, env, []);
    if (res.kind !== "return") throw new Error(`Algorithm '${algoId}' ended without return`);

    this.stack.pop();
    this.frameStack.pop();
    return res.value;
  }

  private execBlock(algoId: string, body: Instr[], env: Env, path: (number | string)[]): ExecResult {
    for (let i = 0; i < body.length; i++) {
      const instr = body[i];
      const nodePath = [...path, i];

      if (instr.op === "let") {
        const before = env[instr.name];
        const meta: EvalMeta = {};
        const value = this.evalExpr(algoId, instr.expr, env, meta);
        env[instr.name] = value;

        const transitions = [
          ...this.buildTransitionsFromUIHint(instr.expr, before, value, instr.meta?.ui),
          ...(meta.callSiteTransitions ?? []),
        ];

        this.pushStep({
          kind: "let",
          algoId,
          nodePath,
          hint: instr.hint,
          specStep: instr.meta?.specStep,
          envDelta: { [instr.name]: value },
          transitions: transitions.length ? transitions : undefined,
          stack: [...this.stack],
          frameId: this.frameStack[this.frameStack.length - 1],
          parentFrameId: this.frameStack[this.frameStack.length - 2],
        });
        continue;
      }

      if (instr.op === "if") {
        const condVal = this.evalExpr(algoId, instr.cond, env);
        if (condVal.type !== "Boolean") throw new Error(`IF condition must be Boolean, got ${condVal.type}`);
        const taken: "then" | "else" = condVal.value ? "then" : "else";

        this.pushStep({
          kind: "if",
          algoId,
          nodePath,
          hint: instr.hint,
          specStep: instr.meta?.specStep,
          condPretty: this.prettyExpr(instr.cond),
          decision: {
            taken,
            why: this.whyForCondition(condVal.value, instr.cond),
          },
          stack: [...this.stack],
          frameId: this.frameStack[this.frameStack.length - 1],
          parentFrameId: this.frameStack[this.frameStack.length - 2],
        });

        const branch = taken === "then" ? instr.then : instr.else;
        const branchPath = [...nodePath, taken];
        const res = this.execBlock(algoId, branch, env, branchPath);
        if (res.kind === "return") return res;
        continue;
      }

      if (instr.op === "return") {
        const meta: EvalMeta = {};
        const value = this.evalExpr(algoId, instr.expr, env, meta);

        // For ConcatStrings / AddNumbers show a nice domain transition
        const extra = this.buildOperatorTransitions(instr.expr, env);

        const transitions = [
          ...this.buildTransitionsFromUIHint(instr.expr, undefined, value, instr.meta?.ui),
          ...(meta.callSiteTransitions ?? []),
          ...extra,
        ];

        this.pushStep({
          kind: "return",
          algoId,
          nodePath,
          hint: instr.hint,
          specStep: instr.meta?.specStep,
          value,
          transitions: transitions.length ? transitions : undefined,
          stack: [...this.stack],
          frameId: this.frameStack[this.frameStack.length - 1],
          parentFrameId: this.frameStack[this.frameStack.length - 2],
        });
        return { kind: "return", value };
      }

      const _never: never = instr;
      throw new Error(`Unknown instruction: ${String(_never)}`);
    }

    return { kind: "continue" };
  }

  private evalExpr(algoId: string, expr: Expr, env: Env, meta?: EvalMeta): SpecValue {
    if ("var" in expr) {
      const v = env[expr.var];
      if (!v) throw new Error(`Unknown variable '${expr.var}' in ${algoId}`);
      return v;
    }
    if ("lit" in expr) return expr.lit;

    if (expr.op === "call") {
      if (!("algo" in expr)) throw new Error(`Invalid call expression in ${algoId}`);
      const args = expr.args.map((a) => this.evalExpr(algoId, a, env));
      const fromAlgo = this.stack[this.stack.length - 1];
      const parentFrameId = this.frameStack[this.frameStack.length - 1];
      const frameId = this.newFrameId();

      this.pushStep({
        kind: "call",
        fromAlgo,
        toAlgo: expr.algo,
        args,
        stack: [...this.stack, expr.algo],
        frameId,
        parentFrameId,
      });

      const input0 = args[0];
      const value = this.callAlgo(expr.algo, args, frameId);

      this.pushStep({
        kind: "ret",
        fromAlgo: expr.algo,
        value,
        stack: [...this.stack],
        frameId,
        parentFrameId,
      });

      // Call-site coercion transitions: attach to the caller (let/return), not inside callee.
      if (meta && this.opts.autoTransitions && this.opts.coercionAlgos.includes(expr.algo) && input0) {
        if (input0.type !== value.type) {
          const t: TraceTransition = {
            kind: "coercion",
            op: expr.algo,
            from: input0,
            to: value,
            why: `Type changed during ${expr.algo}`,
          };
          meta.callSiteTransitions = [...(meta.callSiteTransitions ?? []), t];
        }
      }

      return value;
    }

    if (expr.op === "ifExpr") {
      if (!("cond" in expr) || !("then" in expr) || !("else" in expr)) throw new Error(`Invalid ifExpr in ${algoId}`);
      const cond = this.evalExpr(algoId, expr.cond, env);
      if (cond.type !== "Boolean") throw new Error(`ifExpr cond must be Boolean`);
      return cond.value ? this.evalExpr(algoId, expr.then, env) : this.evalExpr(algoId, expr.else, env);
    }

    const fn = this.intrinsics[expr.op];
    if (!fn) throw new Error(`Unknown intrinsic op: ${expr.op}`);
    const argExprs = "args" in expr ? (expr.args ?? []) : [];
    const args = argExprs.map((a) => this.evalExpr(algoId, a, env));
    return fn(args);
  }

  private buildTransitionsFromUIHint(
    expr: Expr,
    before: SpecValue | undefined,
    after: SpecValue,
    ui?: UIHint,
  ): TraceTransition[] {
    if (!ui?.markAsCoercion) return [];
    if (!before) return [];
    return [
      {
        kind: "coercion",
        op: this.inferOpNameFromExpr(expr),
        from: before,
        to: after,
        why: ui.explain ?? "Coercion step",
        label: ui.label,
      },
    ];
  }

  private buildOperatorTransitions(expr: Expr, env: Env): TraceTransition[] {
    // Detect ConcatStrings(sx, sy) or AddNumbers(nx, ny) patterns
    if (!("op" in expr) || expr.op === "call" || expr.op === "ifExpr") return [];
    if (expr.op === "ConcatStrings" && expr.args?.length === 2) {
      const a = this.evalExpr("internal", expr.args[0], env);
      const b = this.evalExpr("internal", expr.args[1], env);
      const out = this.intrinsics["ConcatStrings"]([a, b]);
      return [{ kind: "concat", op: "+", from: [a, b], to: out, why: "String concatenation" }];
    }
    if (expr.op === "AddNumbers" && expr.args?.length === 2) {
      const a = this.evalExpr("internal", expr.args[0], env);
      const b = this.evalExpr("internal", expr.args[1], env);
      const out = this.intrinsics["AddNumbers"]([a, b]);
      return [{ kind: "add", op: "+", from: [a, b], to: out, why: "Numeric addition" }];
    }
    return [];
  }

  private inferOpNameFromExpr(expr: Expr): string {
    if ("lit" in expr) return "Literal";
    if ("var" in expr) return "Var";
    if (expr.op === "call") return "algo" in expr ? expr.algo : "call";
    if (expr.op === "ifExpr") return "ifExpr";
    return expr.op;
  }

  private prettyExpr(expr: Expr): string {
    if ("var" in expr) return expr.var;
    if ("lit" in expr) return `${expr.lit.type}(${String(expr.lit.value)})`;
    if (expr.op === "call") {
      if (!("algo" in expr)) return "call(…)";
      return `${expr.algo}(${expr.args.map((a) => this.prettyExpr(a)).join(", ")})`;
    }
    if (expr.op === "ifExpr") {
      if (!("cond" in expr)) return "ifExpr(…)";
      return `ifExpr(${this.prettyExpr(expr.cond)})`;
    }
    const argExprs = "args" in expr ? (expr.args ?? []) : [];
    return `${expr.op}(${argExprs.map((a) => this.prettyExpr(a)).join(", ")})`;
  }

  private whyForCondition(result: boolean, cond: Expr): string {
    const s = this.prettyExpr(cond);
    if (s.startsWith("SameValue(")) return result ? "Values match" : "Values differ";
    if (s.startsWith("And(")) return result ? "Both conditions true" : "At least one condition false";
    if (s.startsWith("Or(")) return result ? "At least one condition true" : "Both conditions false";
    return `Condition is ${result ? "true" : "false"}`;
  }

  private pushStep(step: TraceStepWithoutId) {
    this.steps.push({ ...step, stepId: ++this.stepId } as TraceStep);
  }

  private newFrameId(): string {
    this.frameIdCounter += 1;
    return `f${this.frameIdCounter}`;
  }
}
