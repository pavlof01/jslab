/**
 * Converts a raw TraceNode tree (from engine262) into a flat array of render-ready steps.
 * Each step is self-contained: it carries its own `depth` and `callStack` so the frontend
 * can render with a simple `.map()` without any additional state or transformations.
 */
import type { TraceNode, TraceStep as EngineStep } from "../../trace/index.mts";
import { ALGO_SPEC_URL } from "../spec-generator.ts";

// ─── Serialized value (mirrors SpecValue from frontend/spec-runner.ts) ────────

export type SerializedValue =
  | { type: "Undefined" }
  | { type: "Null"; value: null }
  | { type: "Boolean"; value: boolean }
  | { type: "Number"; value: number | "NaN" }
  | { type: "String"; value: string }
  | { type: "Symbol"; value: { id: string; description?: string } }
  | { type: "BigInt"; value: string }
  | { type: "Object"; value: { id: string; class: string; preview?: string } };

// ─── Call-stack frame (used in breadcrumb header) ─────────────────────────────

export type FrameSnapshot = { algoId: string; specUrl?: string };

// ─── Flat step — each step is self-contained with depth + callStack ───────────

export type FlatStep =
  | {
      stepId: number; kind: "call";
      depth: number; callStack: FrameSnapshot[];
      fromAlgo?: string; toAlgo: string;
      args: SerializedValue[]; result?: SerializedValue;
      specUrl?: string;
      stack: string[]; frameId: string; parentFrameId?: string;
    }
  | {
      stepId: number; kind: "let";
      depth: number; callStack: FrameSnapshot[];
      algoId: string; nodePath: (number | string)[];
      hint?: string; envDelta: Record<string, SerializedValue>;
      stack: string[]; frameId: string; parentFrameId?: string;
      varName?: string;
      /** Present when this let-step immediately triggers a sub-algorithm call. */
      callStep?: { toAlgo: string; args: SerializedValue[]; specUrl?: string };
    }
  | {
      stepId: number; kind: "if";
      depth: number; callStack: FrameSnapshot[];
      algoId: string; nodePath: (number | string)[];
      hint?: string; condPretty?: string;
      decision: { taken: "else"; why: string };
      stack: string[]; frameId: string; parentFrameId?: string;
    }
  | {
      stepId: number; kind: "return";
      depth: number; callStack: FrameSnapshot[];
      algoId: string; nodePath: (number | string)[];
      hint?: string; value: SerializedValue;
      stack: string[]; frameId: string; parentFrameId?: string;
    };

// ─── Value serialization ──────────────────────────────────────────────────────

function toValue(str: string | undefined): SerializedValue {
  if (str === undefined) return { type: "Undefined" };
  if (str === "null") return { type: "Null", value: null };
  if (str === "true") return { type: "Boolean", value: true };
  if (str === "false") return { type: "Boolean", value: false };
  if (str === "NaN") return { type: "Number", value: "NaN" };
  // Type-name placeholders emitted when actual value string is unavailable
  if (str === "Object") return { type: "Object", value: { id: "obj", class: "Object" } };
  if (str === "Number") return { type: "Number", value: "NaN" };
  if (str === "String") return { type: "String", value: "" };
  if (str === "Boolean") return { type: "Boolean", value: false };
  if (str === "Null") return { type: "Null", value: null };
  if (str === "Undefined") return { type: "Undefined" };
  if (str === "Symbol") return { type: "Symbol", value: { id: "sym" } };
  if (str === "BigInt") return { type: "BigInt", value: "0" };
  // Object / array preview
  if ((str.startsWith("{") && str.endsWith("}")) || (str.startsWith("[") && str.endsWith("]"))) {
    return { type: "Object", value: { id: "display", class: "", preview: str } };
  }
  // Double-quoted string (from JSON.stringify in convertInputToString)
  if (str.startsWith('"') && str.endsWith('"') && str.length >= 2) {
    return { type: "String", value: str.slice(1, -1) };
  }
  return { type: "String", value: str };
}

// ─── Tree → flat step array ───────────────────────────────────────────────────

let _fc = 0; // frame counter
let _sc = 0; // step counter
let _frameStack: FrameSnapshot[] = [];

function inlineNode(node: TraceNode, parentFrameId: string | undefined, parentAlgoId: string | undefined, out: FlatStep[]): void {
  const frameId = `${node.algoId}_${_fc++}`;
  const frame: FrameSnapshot = { algoId: node.algoId, specUrl: ALGO_SPEC_URL[node.algoId] };

  // Push frame onto stack before emitting the call step
  _frameStack.push(frame);

  // depth for call: show at caller level (one below current top)
  const callDepth = Math.max(0, _frameStack.length - 2);
  const callStack = [..._frameStack];

  // Boundary: entering algorithm
  out.push({
    stepId: _sc++,
    kind: "call",
    depth: callDepth,
    callStack,
    fromAlgo: parentAlgoId,
    toAlgo: node.algoId,
    args: node.inputs.length > 0 ? [toValue(node.inputs[0])] : [],
    result: node.output !== undefined ? toValue(node.output) : undefined,
    specUrl: ALGO_SPEC_URL[node.algoId],
    stack: [],
    frameId,
    parentFrameId,
  });

  // depth for steps inside this frame
  const innerDepth = Math.max(0, _frameStack.length - 1);
  const innerStack = callStack; // same snapshot — frame stack doesn't change for inner steps

  // Sort steps: specOrder ascending, return/throw always last
  const sorted = [...node.steps].sort((a, b) => {
    const terminal = (s: EngineStep) => s.kind === "return" || s.kind === "throw";
    if (terminal(a) && !terminal(b)) return 1;
    if (!terminal(a) && terminal(b)) return -1;
    if (a.specOrder !== undefined && b.specOrder !== undefined) return a.specOrder - b.specOrder;
    if (a.specOrder !== undefined) return -1;
    if (b.specOrder !== undefined) return 1;
    return 0;
  });

  // Map each call-kind engine step (by step#) to its child TraceNode
  const callSteps = node.steps.filter(s => s.kind === "call").sort((a, b) => a.step - b.step);
  const childByStep = new Map<number, TraceNode>();
  node.children.forEach((child, idx) => {
    if (idx < callSteps.length) childByStep.set(callSteps[idx].step, child);
  });

  for (const step of sorted) {
    const stepId = _sc++;
    const base = {
      depth: innerDepth,
      callStack: innerStack,
      algoId: node.algoId,
      nodePath: [stepId] as (number | string)[],
      stack: [] as string[],
      frameId,
      parentFrameId,
    };

    const isSkipped = step.kind === "if" && !(step.taken ?? (step.value !== undefined));
    if (isSkipped) {
      out.push({ stepId, kind: "if", ...base, hint: step.hint, condPretty: step.hint, decision: { taken: "else", why: "Condition not met" } });
    } else if (step.kind === "return") {
      out.push({ stepId, kind: "return", ...base, hint: step.hint, value: toValue(step.output ?? step.value ?? node.output) });
    } else {
      const val = step.output ?? step.value;
      out.push({ stepId, kind: "let", ...base, hint: step.hint, envDelta: val !== undefined ? { result: toValue(val) } : {}, varName: step.varName });
    }

    // Inline child algorithm immediately after the step that triggered it
    const child = childByStep.get(step.step);
    if (child) inlineNode(child, frameId, node.algoId, out);
  }

  // Pop frame (ret step is no longer emitted — post-processing handles merging)
  _frameStack.pop();
}

export function buildFlatTrace(nodes: TraceNode[]): FlatStep[] {
  _fc = 0;
  _sc = 0;
  _frameStack = [];
  const raw: FlatStep[] = [];
  if (nodes.length > 0) inlineNode(nodes[0], undefined, undefined, raw);

  // Strip the entry-point call (always first, rendered as EntryPointSection on frontend)
  const withoutEntry = raw[0]?.kind === "call" ? raw.slice(1) : raw;

  // Merge consecutive let(varName) + call pairs into a single let step with embedded callStep
  const out: FlatStep[] = [];
  let i = 0;
  while (i < withoutEntry.length) {
    const step = withoutEntry[i];
    const next = withoutEntry[i + 1];
    if (step.kind === "let" && step.varName && next?.kind === "call") {
      out.push({
        ...step,
        callStep: { toAlgo: next.toAlgo, args: next.args, specUrl: next.specUrl },
      });
      i += 2;
    } else {
      out.push(step);
      i++;
    }
  }
  return out;
}
