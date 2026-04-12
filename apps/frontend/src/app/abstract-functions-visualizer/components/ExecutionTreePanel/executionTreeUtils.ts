import type { SpecValue, TraceStep } from "@/app/abstract-functions-visualizer/spec-runner";

export function getPrimaryEnvDelta(step: TraceStep): { name: string; value: SpecValue } | undefined {
  if (step.kind !== "let") return undefined;
  const entries = Object.entries(step.envDelta);
  if (!entries.length) return undefined;
  const [name, value] = entries[0];
  if (!value) return undefined;
  return { name, value };
}

