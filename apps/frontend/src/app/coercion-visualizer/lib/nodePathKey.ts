import type { NodePath } from "@/app/coercion-visualizer/traceModel";

export function nodePathKey(nodePath?: NodePath): string {
  if (!nodePath?.length) return "";
  return nodePath.map((seg) => (typeof seg === "number" ? `n${seg}` : `s${String(seg)}`)).join(".");
}

