import type { StepRowState } from "./step-node.types";

export function frameBackground({ active, nested }: { active: boolean; nested: boolean }): string {
  if (active) return "surface.accentSoft";
  if (nested) return "surface.band";
  return "surface.panel";
}

export function rowStyles(state: StepRowState) {
  return {
    opacity: state === "pending" ? "pending" : 1,
    bg: state === "current" ? "surface.accentRow" : "transparent",
    mx: "-8px",
    px: "8px",
    py: "2px",
    transitionProperty: "opacity, background",
    transitionDuration: "reveal",
    transitionTimingFunction: "DEFAULT",
  } as const;
}
