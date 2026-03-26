import type { SpecValue, TraceStep, TraceTransition } from "@/app/abstract-functions-visualizer/spec-runner";

export type NodePath = (number | string)[];
export type EnvSnapshot = Record<string, SpecValue>;

export type TraceFrame = {
  id: string;
  algoId: string;
  parentFrameId?: string;
  params: EnvSnapshot;
  locals: EnvSnapshot;
};

export type FlattenedEnvEntry = {
  key: string; // AlgoId.varName (display key)
  algoId: string;
  frameId: string;
  name: string;
  scope: "param" | "local";
  value: SpecValue;
};

export type FrameTree = {
  roots: string[];
  parentById: Record<string, string | undefined>;
  childrenById: Record<string, string[]>;
  algoIdByFrameId: Record<string, string>;
};

export enum TransitionKind {
  Coercion = "Coercion",
  Concatenation = "Concatenation",
  NumericAddition = "NumericAddition",
  BranchDecision = "BranchDecision",
  ReturnValue = "ReturnValue",
}

export type ExplorerTransition = {
  id: string;
  kind: TransitionKind;
  label: string;
  description: string;
  before?: SpecValue | [SpecValue, SpecValue];
  after?: SpecValue;
  frameId?: string;
  stepIndex: number;
  nodePath?: NodePath;
};

export type TraceModel = {
  hasFrameIds: boolean;
  frameTree: FrameTree;
  framesByStep: TraceFrame[][];
  visibleEnvByStep: EnvSnapshot[];
  visibleDiffKeysByStep: string[][];
  flattenedEnvByStep: FlattenedEnvEntry[][];
  transitionsByStep: ExplorerTransition[][];
};

type FrameState = TraceFrame;

type BuildTraceModelOpts = {
  getAlgoParams?: (algoId: string) => string[] | undefined;
  getAlgoLocals?: (algoId: string) => string[] | undefined;
};

function cloneEnv(env: EnvSnapshot): EnvSnapshot {
  return { ...env };
}

function cloneFrame(frame: FrameState): TraceFrame {
  return {
    id: frame.id,
    algoId: frame.algoId,
    parentFrameId: frame.parentFrameId,
    params: cloneEnv(frame.params),
    locals: cloneEnv(frame.locals),
  };
}

function flattenFrames(frames: FrameState[]): FlattenedEnvEntry[] {
  const out: FlattenedEnvEntry[] = [];
  for (const frame of frames) {
    for (const [name, value] of Object.entries(frame.params)) {
      out.push({
        key: `${frame.algoId}.${name}`,
        algoId: frame.algoId,
        frameId: frame.id,
        name,
        scope: "param",
        value,
      });
    }
    for (const [name, value] of Object.entries(frame.locals)) {
      out.push({
        key: `${frame.algoId}.${name}`,
        algoId: frame.algoId,
        frameId: frame.id,
        name,
        scope: "local",
        value,
      });
    }
  }
  return out;
}

function mergeVisibleEnv(frame?: FrameState): EnvSnapshot {
  if (!frame) return Object.create(null) as EnvSnapshot;
  return { ...frame.params, ...frame.locals };
}

function traceTransitionToExplorerTransition(
  t: TraceTransition,
  stepIndex: number,
  frameId: string | undefined,
  nodePath: NodePath | undefined,
  ordinal: number,
): ExplorerTransition {
  if (t.kind === "coercion") {
    return {
      id: `${stepIndex}:coercion:${ordinal}`,
      kind: TransitionKind.Coercion,
      label: t.label ?? `${t.op}: ${t.from.type} → ${t.to.type}`,
      description: t.why,
      before: t.from,
      after: t.to,
      frameId,
      stepIndex,
      nodePath,
    };
  }

  if (t.kind === "concat") {
    return {
      id: `${stepIndex}:concat:${ordinal}`,
      kind: TransitionKind.Concatenation,
      label: "Concatenation",
      description: t.why,
      before: t.from,
      after: t.to,
      frameId,
      stepIndex,
      nodePath,
    };
  }

  if (t.kind === "add") {
    return {
      id: `${stepIndex}:add:${ordinal}`,
      kind: TransitionKind.NumericAddition,
      label: "Numeric addition",
      description: t.why,
      before: t.from,
      after: t.to,
      frameId,
      stepIndex,
      nodePath,
    };
  }

  const _exhaustive: never = t;
  return _exhaustive;
}

export function buildTraceModel(trace: TraceStep[], opts?: BuildTraceModelOpts): TraceModel {
  const hasFrameIds = trace.some((s) => typeof s.frameId === "string" && s.frameId.length > 0);

  const frames: FrameState[] = [];
  const framesByStep: TraceFrame[][] = [];
  const visibleEnvByStep: EnvSnapshot[] = [];
  const visibleDiffKeysByStep: string[][] = [];
  const flattenedEnvByStep: FlattenedEnvEntry[][] = [];

  const frameTree: FrameTree = {
    roots: [],
    parentById: Object.create(null),
    childrenById: Object.create(null),
    algoIdByFrameId: Object.create(null),
  };
  const rootSet = new Set<string>();
  const childrenSetById = new Map<string, Set<string>>();

  let legacyFrameIdCounter = 0;
  const nextLegacyFrameId = () => {
    legacyFrameIdCounter += 1;
    return `legacy_f${legacyFrameIdCounter}`;
  };

  const makeUndefined = (): SpecValue => ({ type: "Undefined", value: undefined });

  for (let stepIndex = 0; stepIndex < trace.length; stepIndex++) {
    const step = trace[stepIndex];
    let diffKeys: string[] = [];

    if (step.kind === "call") {
      const frameId = step.frameId ?? nextLegacyFrameId();
      const parentFrameId = step.parentFrameId ?? frames[frames.length - 1]?.id;

      const paramNames = opts?.getAlgoParams?.(step.toAlgo) ?? [];
      const params: EnvSnapshot = Object.create(null);
      for (let i = 0; i < paramNames.length; i++) {
        const v = step.args[i];
        params[paramNames[i]] = v ?? makeUndefined();
      }

      const locals: EnvSnapshot = Object.create(null);
      const localNames = opts?.getAlgoLocals?.(step.toAlgo) ?? [];
      for (const name of localNames) {
        if (name in params) continue;
        if (name in locals) continue;
        locals[name] = makeUndefined();
      }

      frames.push({
        id: frameId,
        algoId: step.toAlgo,
        parentFrameId: parentFrameId ?? undefined,
        params,
        locals,
      });

      frameTree.algoIdByFrameId[frameId] = step.toAlgo;
      frameTree.parentById[frameId] = parentFrameId ?? undefined;
      if (parentFrameId) {
        frameTree.childrenById[parentFrameId] ??= [];
        let seen = childrenSetById.get(parentFrameId);
        if (!seen) {
          seen = new Set<string>();
          childrenSetById.set(parentFrameId, seen);
        }
        if (!seen.has(frameId)) {
          seen.add(frameId);
          frameTree.childrenById[parentFrameId].push(frameId);
        }
      } else {
        if (!rootSet.has(frameId)) {
          rootSet.add(frameId);
          frameTree.roots.push(frameId);
        }
      }
    } else if (step.kind === "ret") {
      if (hasFrameIds && step.frameId) {
        let idx = -1;
        for (let i = frames.length - 1; i >= 0; i--) {
          if (frames[i]?.id === step.frameId) {
            idx = i;
            break;
          }
        }
        if (idx >= 0) frames.splice(idx, frames.length - idx);
        else frames.pop();
      } else {
        frames.pop();
      }
    } else if (step.kind === "let") {
      const frameId = hasFrameIds ? step.frameId : undefined;
      const targetId = frameId ?? frames[frames.length - 1]?.id;
      const target = targetId ? frames.find((f) => f.id === targetId) : undefined;
      if (target) {
        for (const [k, v] of Object.entries(step.envDelta)) {
          if (Object.prototype.hasOwnProperty.call(target.params, k)) target.params[k] = v;
          else target.locals[k] = v;
        }
        const topId = frames[frames.length - 1]?.id;
        diffKeys = target.id === topId ? Object.keys(step.envDelta) : [];
      }
    }

    const top = frames[frames.length - 1];
    visibleEnvByStep.push(mergeVisibleEnv(top));
    visibleDiffKeysByStep.push(diffKeys);
    flattenedEnvByStep.push(flattenFrames(frames));
    framesByStep.push(frames.map(cloneFrame));
  }

  const transitionsByStep: ExplorerTransition[][] = trace.map(() => []);

  const frameIdForStep = (step: TraceStep, stepIndex: number): string | undefined => {
    if (typeof step.frameId === "string" && step.frameId.length > 0) return step.frameId;
    if (step.kind === "ret" || step.kind === "return") {
      const prev = framesByStep[stepIndex - 1];
      const prevId = prev?.[prev.length - 1]?.id;
      if (prevId) return prevId;
    }
    const current = framesByStep[stepIndex];
    return current?.[current.length - 1]?.id;
  };

  for (let i = 0; i < trace.length; i++) {
    const step = trace[i];
    const frameId = frameIdForStep(step, i);
    const nodePath = "nodePath" in step ? (step.nodePath as NodePath) : undefined;

    if ((step.kind === "let" || step.kind === "return") && step.transitions?.length) {
      transitionsByStep[i].push(
        ...step.transitions.map((t, ordinal) => traceTransitionToExplorerTransition(t, i, frameId, nodePath, ordinal)),
      );
    }

    if (step.kind === "if") {
      transitionsByStep[i].push({
        id: `${i}:branch:0`,
        kind: TransitionKind.BranchDecision,
        label: `branch: ${step.decision.taken}`,
        description: step.decision.why,
        after: { type: "Boolean", value: step.decision.taken === "then" },
        frameId,
        stepIndex: i,
        nodePath: step.nodePath as NodePath,
      });
    }

    if (step.kind === "return") {
      transitionsByStep[i].push({
        id: `${i}:return:0`,
        kind: TransitionKind.ReturnValue,
        label: "return",
        description: step.hint ?? "Return value",
        after: step.value,
        frameId,
        stepIndex: i,
        nodePath: step.nodePath as NodePath,
      });
    }
  }

  return {
    hasFrameIds,
    frameTree,
    framesByStep,
    visibleEnvByStep,
    visibleDiffKeysByStep,
    flattenedEnvByStep,
    transitionsByStep,
  };
}

export type TraceEnvModel = {
  snapshots: EnvSnapshot[];
  diffs: string[][];
  framesByStep: Array<
    Array<{
      algoId: string;
      args: SpecValue[];
      params: EnvSnapshot;
      env: EnvSnapshot;
    }>
  >;
};

export function buildTraceEnvModel(
  trace: TraceStep[],
  getAlgoParams?: (algoId: string) => string[] | undefined,
): TraceEnvModel {
  // Legacy wrapper for the original Coercion Visualizer UI model.
  const model = buildTraceModel(trace, { getAlgoParams });
  const framesByStep = model.framesByStep.map((stack, idx) =>
    stack.map((f) => ({
      algoId: f.algoId,
      args:
        trace[idx]?.kind === "call" && trace[idx].toAlgo === f.algoId
          ? trace[idx].args
          : [],
      params: cloneEnv(f.params),
      env: { ...f.params, ...f.locals },
    })),
  );
  return { snapshots: model.visibleEnvByStep, diffs: model.visibleDiffKeysByStep, framesByStep };
}

export function formatNodePath(nodePath?: NodePath): string {
  if (!nodePath?.length) return "";
  return nodePath
    .map((seg) => {
      if (typeof seg === "number") return `${seg + 1}`;
      if (seg === "then") return "then";
      if (seg === "else") return "else";
      return String(seg);
    })
    .join(" › ");
}

export function formatSpecValue(value: SpecValue, maxLen = 42): string {
  const raw = (() => {
    switch (value.type) {
      case "Undefined":
        return "undefined";
      case "Null":
        return "null";
      case "Boolean":
        return String(value.value);
      case "Number":
        if (value.value === "NaN") return "NaN";
        if (Object.is(value.value, -0)) return "-0";
        return String(value.value);
      case "String":
        return JSON.stringify(value.value);
      case "BigInt":
        return `${value.value}n`;
      case "Symbol": {
        const hasDesc = value.value.description !== undefined;
        const base = hasDesc ? `Symbol(${JSON.stringify(value.value.description)})` : "Symbol()";
        return `${base}@${value.value.id}`;
      }
      case "Object":
        return value.value.preview ? `${value.value.class}(${value.value.preview})` : `${value.value.class}#${value.value.id}`;
      case "Array":
        return JSON.stringify(value.value);
      case "TypeTag":
        return `TypeTag(${value.value})`;
      default: {
        const _exhaustive: never = value;
        return String(_exhaustive);
      }
    }
  })();

  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, Math.max(0, maxLen - 1))}…`;
}
