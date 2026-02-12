import type { SpecValue } from "@/app/coercion-visualizer/spec-runner";

export type Op = "==" | "+" | "String(x)" | "Number(x)";
export type Mode = "coercion" | "algorithm";

export const OP_ITEMS: Array<{ label: string; value: Op }> = [
  { label: "x == y", value: "==" },
  { label: "x + y", value: "+" },
  { label: "String(x)", value: "String(x)" },
  { label: "Number(x)", value: "Number(x)" },
];

export type Preset = { label: string; op: Op; x: SpecValue; y?: SpecValue };
export const PRESETS: readonly Preset[] = [
  { label: `1 == "1"`, op: "==", x: { type: "Number", value: 1 }, y: { type: "String", value: "1" } },
  { label: `"1" + 2`, op: "+", x: { type: "String", value: "1" }, y: { type: "Number", value: 2 } },
  { label: `1 + "2"`, op: "+", x: { type: "Number", value: 1 }, y: { type: "String", value: "2" } },
  {
    label: `[] + {}`,
    op: "+",
    x: { type: "Object", value: { id: "arr1", class: "Array", preview: "[]" } },
    y: { type: "Object", value: { id: "obj1", class: "Object", preview: "{}" } },
  },
  { label: `String(null)`, op: "String(x)", x: { type: "Null", value: null } },
  { label: `Number("  ")`, op: "Number(x)", x: { type: "String", value: "  " } },
] as const;

export function isUnary(op: Op) {
  return op === "String(x)" || op === "Number(x)";
}

export function computeEntry(
  op: Op,
  x: SpecValue,
  y: SpecValue,
): { entryAlgo: string; args: SpecValue[]; preview: string } {
  if (op === "==") return { entryAlgo: "AbstractEqualityComparison", args: [x, y], preview: "x == y" };
  if (op === "+") return { entryAlgo: "Add", args: [x, y], preview: "x + y" };
  if (op === "String(x)") return { entryAlgo: "ToString", args: [x], preview: "String(x)" };
  return { entryAlgo: "ToNumber", args: [x], preview: "Number(x)" };
}
