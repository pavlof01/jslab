import type { Algorithm, Instr } from "@/app/coercion-visualizer/spec-runner";
import type { NodePath } from "@/app/coercion-visualizer/traceModel";

export function getInstrAtPath(algo: Algorithm, nodePath?: NodePath): Instr | undefined {
  if (!nodePath?.length) return undefined;
  let body: Instr[] = algo.body;
  let current: Instr | undefined;

  for (let i = 0; i < nodePath.length; i++) {
    const seg = nodePath[i];
    if (typeof seg !== "number") return undefined;
    current = body[seg];
    if (!current) return undefined;

    const next = nodePath[i + 1];
    if (next === "then" || next === "else") {
      if (current.op !== "if") return undefined;
      body = next === "then" ? current.then : current.else;
      i++;
      continue;
    }
  }

  return current;
}

