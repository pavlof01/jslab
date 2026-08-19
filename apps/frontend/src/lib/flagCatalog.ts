import type { EngineKey } from "@/lib/types";

/**
 * Mirrors the shape of `FlagSpec` in @jslab/engine-runtime, which the gateway
 * serves over /api/flags. The frontend builds from its own directory and cannot
 * import that package, so this is a deliberate copy — keep the two in step when
 * a field is added there.
 */
export interface FlagOption {
  flag: string;
  description: string;
  category: FlagCategory;
  takesValue?: boolean;
}

export type FlagCategory =
  | "bytecode"
  | "codegen"
  | "optimization"
  | "inline-caches"
  | "object-shapes"
  | "parser"
  | "regexp"
  | "wasm"
  | "gc"
  | "diagnostics"
  | "runtime";

export const CATEGORY_LABELS: Array<{ category: FlagCategory; label: string }> = [
  { category: "bytecode", label: "Bytecode" },
  { category: "parser", label: "AST & parser" },
  { category: "codegen", label: "Machine code" },
  { category: "optimization", label: "Optimisation" },
  { category: "inline-caches", label: "Inline caches" },
  { category: "object-shapes", label: "Object shapes" },
  { category: "regexp", label: "RegExp" },
  { category: "wasm", label: "Wasm" },
  { category: "gc", label: "GC" },
  { category: "diagnostics", label: "Diagnostics" },
  { category: "runtime", label: "Runtime" },
];

/** What each engine offers. Engines with no flags of their own are simply absent. */
export type EngineFlagCatalog = Partial<Record<EngineKey, FlagOption[]>>;

export type FlagGroup = { label: string; flags: FlagOption[] };

export function groupFlags(flags: readonly FlagOption[]): FlagGroup[] {
  return CATEGORY_LABELS.map(({ category, label }) => ({
    label,
    flags: flags.filter((flag) => flag.category === category && !flag.takesValue),
  })).filter((group) => group.flags.length > 0);
}
