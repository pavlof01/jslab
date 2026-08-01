/**
 * Curated "what does this print?" challenges focused on JavaScript coercion and
 * evaluation gotchas — the same territory the abstract-operations visualizer
 * explains. Each item can be opened in the playground to see the real output,
 * and links to the relevant spec tracer where useful.
 */
export interface Quiz {
  id: string;
  /** Code shown to the user; the expression whose output they must predict. */
  code: string;
  options: string[];
  /** Index into `options` of the correct answer. */
  answer: number;
  explanation: string;
}

export const quizzes: Quiz[] = [
  {
    id: "array-plus-object",
    code: 'console.log([] + {})',
    options: ['"[object Object]"', '"0"', '"[]{}"', "0"],
    answer: 0,
    explanation:
      "Both operands are coerced with ToPrimitive. [] → \"\" and {} → \"[object Object]\", so + concatenates them into \"[object Object]\".",
  },
  {
    id: "array-loose-not-array",
    code: "console.log([] == ![])",
    options: ["true", "false", "TypeError", "undefined"],
    answer: 0,
    explanation:
      "![] is false. Then [] == false → [] == 0 → \"\" == 0 → 0 == 0 → true. Boolean and object both get coerced toward numbers.",
  },
  {
    id: "typeof-null",
    code: "console.log(typeof null)",
    options: ['"object"', '"null"', '"undefined"', '"boolean"'],
    answer: 0,
    explanation: 'typeof null is "object" — a bug preserved since JavaScript 1.0 for backwards compatibility.',
  },
  {
    id: "float-sum",
    code: "console.log(0.1 + 0.2 === 0.3)",
    options: ["false", "true", "NaN", "TypeError"],
    answer: 0,
    explanation: "0.1 + 0.2 is 0.30000000000000004 in IEEE-754 double precision, which is not exactly 0.3.",
  },
  {
    id: "chained-less",
    code: "console.log(1 < 2 < 3)",
    options: ["true", "false", "TypeError", "1"],
    answer: 0,
    explanation: "Left-associative: (1 < 2) is true, then true < 3 → 1 < 3 → true.",
  },
  {
    id: "chained-greater",
    code: "console.log(3 > 2 > 1)",
    options: ["false", "true", "3", "TypeError"],
    answer: 0,
    explanation: "(3 > 2) is true, then true > 1 → 1 > 1 → false. The classic mirror of 1 < 2 < 3.",
  },
  {
    id: "string-minus",
    code: 'console.log("5" - 3, "5" + 3)',
    options: ['2 "53"', '"53" 2', "2 8", '"2" "53"'],
    answer: 0,
    explanation:
      '- has no string overload, so "5" is coerced to number 5 → 2. + prefers string concatenation when either side is a string → "53".',
  },
  {
    id: "array-plus-array",
    code: "console.log([1,2,3] + [4,5,6])",
    options: ['"1,2,34,5,6"', '"[1,2,3][4,5,6]"', "21", '"1,2,3,4,5,6"'],
    answer: 0,
    explanation:
      'Arrays coerce to strings via join(","): "1,2,3" and "4,5,6", then + concatenates → "1,2,34,5,6".',
  },
];
