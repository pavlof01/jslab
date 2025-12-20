export type LooseEqualityRule = {
  id: string; // canonical id, e.g. "step-4"
  title: string; // short label, e.g. "Step 4"
  summary: string; // one-liner
  detail?: string; // slightly longer hint
  anchor?: string; // spec hash anchor
};

const RULES: LooseEqualityRule[] = [
  {
    id: "step-1",
    title: "Step 1",
    summary: "Same Type → return IsStrictlyEqual(x, y).",
    anchor: "#sec-abstract-equality-comparison",
  },
  {
    id: "step-2",
    title: "Step 2",
    summary: "x is null, y is undefined → true.",
    anchor: "#sec-abstract-equality-comparison",
  },
  {
    id: "step-3",
    title: "Step 3",
    summary: "x is undefined, y is null → true.",
    anchor: "#sec-abstract-equality-comparison",
  },
  {
    id: "step-4",
    title: "Step 4",
    summary: "Number vs String → compare x == ToNumber(y).",
    detail: "Coerce the String to Number then recurse.",
    anchor: "#sec-abstract-equality-comparison",
  },
  {
    id: "step-5",
    title: "Step 5",
    summary: "String vs Number → compare ToNumber(x) == y.",
    anchor: "#sec-abstract-equality-comparison",
  },
  {
    id: "step-6",
    title: "Step 6",
    summary: "BigInt vs String → compare x == StringToBigInt(y).",
    detail: "StringToBigInt may throw if the string is invalid.",
    anchor: "#sec-abstract-equality-comparison",
  },
  {
    id: "step-7",
    title: "Step 7",
    summary: "String vs BigInt → compare StringToBigInt(x) == y.",
    detail: "StringToBigInt may throw on bad numeric text.",
    anchor: "#sec-abstract-equality-comparison",
  },
  {
    id: "step-8",
    title: "Step 8",
    summary: "Boolean vs any → compare ToNumber(x) == y.",
    anchor: "#sec-abstract-equality-comparison",
  },
  {
    id: "step-9",
    title: "Step 9",
    summary: "Any vs Boolean → compare x == ToNumber(y).",
    anchor: "#sec-abstract-equality-comparison",
  },
  {
    id: "step-10",
    title: "Step 10",
    summary: "Primitive (String/Number/BigInt/Symbol) vs Object → compare x == ToPrimitive(y).",
    detail: "ToPrimitive uses @@toPrimitive → valueOf → toString, preferring 'default'.",
    anchor: "#sec-abstract-equality-comparison",
  },
  {
    id: "step-11",
    title: "Step 11",
    summary: "Object vs Primitive (String/Number/BigInt/Symbol) → compare ToPrimitive(x) == y.",
    detail: "ToPrimitive mirrors Step 10 on x.",
    anchor: "#sec-abstract-equality-comparison",
  },
  {
    id: "step-12",
    title: "Step 12",
    summary: "BigInt vs Number → if y not integral, false; else compare BigInt(y) to x.",
    anchor: "#sec-abstract-equality-comparison",
  },
  {
    id: "step-13",
    title: "Step 13",
    summary: "Number vs BigInt → if x not integral, false; else compare x to BigInt(y).",
    anchor: "#sec-abstract-equality-comparison",
  },
  {
    id: "step-14",
    title: "Step 14",
    summary: "Otherwise → false.",
    anchor: "#sec-abstract-equality-comparison",
  },
];

const ruleIndex = RULES.reduce<Record<string, LooseEqualityRule>>((acc, rule) => {
  acc[rule.id] = rule;
  acc[rule.title.toLowerCase()] = rule;
  return acc;
}, {});

function normalizeRuleId(rule?: string): string | undefined {
  if (!rule) return undefined;
  const numMatch = rule.match(/step\s*(\d+)/i);
  if (numMatch) return `step-${numMatch[1]}`;
  const lower = rule.trim().toLowerCase();
  if (lower.startsWith("step")) {
    return lower.replace(/\s+/g, "-");
  }
  return undefined;
}

export function findLooseEqualityRule(rule?: string): LooseEqualityRule | undefined {
  const id = normalizeRuleId(rule);
  if (!id) return undefined;
  return ruleIndex[id];
}

export const LOOSE_EQUALITY_RULES = RULES;
