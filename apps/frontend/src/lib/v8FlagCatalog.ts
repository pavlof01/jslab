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

export type FlagGroup = { label: string; flags: FlagOption[] };

export function groupFlags(flags: readonly FlagOption[]): FlagGroup[] {
  return CATEGORY_LABELS.map(({ category, label }) => ({
    label,
    flags: flags.filter((flag) => flag.category === category && !flag.takesValue),
  })).filter((group) => group.flags.length > 0);
}
