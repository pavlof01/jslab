import type { Instr, SpecValue, TraceStep } from "@/app/coercion-visualizer/spec-runner";
import type { TraceFrame } from "@/app/coercion-visualizer/traceModel";

function summarizeInstr(instr?: Instr): string | undefined {
  if (!instr) return undefined;
  if (instr.hint) return instr.hint;
  if (instr.op === "let") return `Let ${instr.name} be …`;
  if (instr.op === "if") return "If ( … ) …";
  return "Return …";
}

export function summarizeBranch(body: Instr[] | undefined): string {
  const first = body?.[0];
  const base = summarizeInstr(first) ?? "—";
  const suffix = body && body.length > 1 ? ` (+${body.length - 1} more)` : "";
  return `${base}${suffix}`;
}

export function getDepthForStep(step: TraceStep, stack: TraceFrame[] | undefined, prevStack: TraceFrame[] | undefined): number {
  if (!stack?.length) return 0;
  // `call` steps include the callee frame in `framesByStep`, but visually they belong to the caller level.
  if (step.kind === "call") return Math.max(0, stack.length - 2);
  // For non-call steps, the depth is the current top frame depth.
  if (step.kind === "ret") return Math.max(0, (prevStack?.length ?? stack.length) - 1);
  return Math.max(0, stack.length - 1);
}

export function getPrimaryEnvDelta(step: TraceStep): { name: string; value: SpecValue } | undefined {
  if (step.kind !== "let") return undefined;
  const entries = Object.entries(step.envDelta);
  if (!entries.length) return undefined;
  const [name, value] = entries[0];
  if (!value) return undefined;
  return { name, value };
}

