import {
  AbstractRelationalComparison,
  ApplyStringOrNumericBinaryOperator,
  IsLooselyEqual,
  IsStrictlyEqual,
  ToBoolean,
  ToIndex,
  ToLength,
  ToNumber,
  ToNumeric,
  ToObject,
  ToPrimitive,
  ToPropertyKey,
  ToString,
  Value,
} from "../trace/index.mts";

/**
 * The abstract operations this service can trace — one table, not four.
 *
 * Every operation used to be spelled out in four places that had to agree by
 * hand: the list advertised to clients, the metadata map, the dispatch switch,
 * and the spec-clause map in spec-generator. They stopped agreeing: the switch
 * grew eleven operations (ToInt32, ToBigInt, …) that no caller could ever
 * reach, because the advertised list — which is what the request schema's enum
 * is built from — never learned about them. Adding an operation is now one
 * entry here: the client-facing list, the metadata, the dispatch and the spec
 * panel all read from it.
 */

export type FunctionCategory = "typeConversion" | "equality";

export interface FunctionMeta {
  category: FunctionCategory;
  /** "unary" → single input; "binary" → expression like "lhs OP rhs". */
  arity: "unary" | "binary";
  /** For binary functions: the operator string used to split the expression. */
  operator?: string;
}

export interface UnaryOperation {
  category: FunctionCategory;
  /** The engine262 abstract operation; a generator for the ones that can call back into JS. */
  call(input: Value, preferredType?: "string" | "number"): unknown;
  /**
   * Spec clauses rendered for this operation, in reading order. An operation is
   * only as useful as the spec panel beside it, so this belongs next to the
   * call, not in a separate map that can quietly lack an entry.
   */
  algos: readonly string[];
}

/**
 * Reaching JS from a conversion always goes through the same chain, so it is
 * named once instead of being retyped in nine lists.
 */
const TO_PRIMITIVE_CHAIN = ["ToPrimitive", "OrdinaryToPrimitive", "GetMethod", "GetV", "ToObject", "Get", "Call"] as const;

export const UNARY_OPERATIONS = {
  ToNumber: {
    category: "typeConversion",
    call: (input) => ToNumber(input),
    algos: ["ToNumber", "StringToNumber", "StringNumericValue", ...TO_PRIMITIVE_CHAIN],
  },
  ToNumeric: {
    category: "typeConversion",
    call: (input) => ToNumeric(input),
    algos: ["ToNumeric", ...TO_PRIMITIVE_CHAIN, "ToNumber"],
  },
  ToString: {
    category: "typeConversion",
    call: (input) => ToString(input),
    algos: ["ToString", "Number::toString", ...TO_PRIMITIVE_CHAIN],
  },
  ToBoolean: {
    category: "typeConversion",
    call: (input) => ToBoolean(input),
    algos: ["ToBoolean"],
  },
  ToPrimitive: {
    category: "typeConversion",
    call: (input, preferredType) => ToPrimitive(input, preferredType),
    algos: [...TO_PRIMITIVE_CHAIN],
  },
  ToObject: {
    category: "typeConversion",
    call: (input) => ToObject(input),
    algos: ["ToObject"],
  },
  ToPropertyKey: {
    category: "typeConversion",
    call: (input) => ToPropertyKey(input),
    algos: ["ToPropertyKey", ...TO_PRIMITIVE_CHAIN, "ToString", "Number::toString"],
  },
  ToLength: {
    category: "typeConversion",
    call: (input) => ToLength(input),
    algos: ["ToLength", "ToNumber", ...TO_PRIMITIVE_CHAIN],
  },
  ToIndex: {
    category: "typeConversion",
    call: (input) => ToIndex(input),
    algos: ["ToIndex", "ToNumber", ...TO_PRIMITIVE_CHAIN],
  },
} satisfies Record<string, UnaryOperation>;

export type UnaryOperationName = keyof typeof UNARY_OPERATIONS;

/** Operation names offered to clients; also the request schema's enum. */
export const AVAILABLE_FUNCTIONS: string[] = Object.keys(UNARY_OPERATIONS);

export const FUNCTION_META: Record<string, FunctionMeta> = Object.fromEntries(
  Object.entries(UNARY_OPERATIONS).map(([name, op]) => [name, { category: op.category, arity: "unary" as const }]),
);

/** Run one unary abstract operation by name. */
export function callUnaryOperation(
  functionName: string,
  input: Value,
  preferredType?: "string" | "number",
): unknown {
  const operation = (UNARY_OPERATIONS as Record<string, UnaryOperation>)[functionName];
  if (!operation) throw new Error(`Unknown function: ${functionName}`);
  return operation.call(input, preferredType);
}

// ── Equality / relational ────────────────────────────────────────────────────

export interface BinaryAlgorithm {
  /** Returns a generator; the two synchronous ops are wrapped so callers stay uniform. */
  call(lhs: Value, rhs: Value, leftFirst: boolean): unknown;
  algos: readonly string[];
}

export const BINARY_ALGORITHMS = {
  IsLooselyEqual: {
    call: (lhs, rhs) => IsLooselyEqual(lhs, rhs),
    algos: [
      "IsLooselyEqual",
      "IsStrictlyEqual",
      "SameValueNonNumber",
      "Number::equal",
      "ToNumber",
      ...TO_PRIMITIVE_CHAIN,
    ],
  },
  IsStrictlyEqual: {
    // IsStrictlyEqual needs no steps of its own, but every entry is driven by
    // callGenerator, so it still has to hand back a generator.
    call: (lhs, rhs) =>
      // biome-ignore lint/correctness/useYield: a generator that only returns is the point here.
      (function* () {
        return IsStrictlyEqual(lhs, rhs);
      })(),
    algos: ["IsStrictlyEqual", "SameValueNonNumber", "Number::equal"],
  },
  ApplyStringOrNumericBinaryOperator: {
    call: (lhs, rhs) => ApplyStringOrNumericBinaryOperator(lhs, "+", rhs),
    algos: [
      "ApplyStringOrNumericBinaryOperator",
      ...TO_PRIMITIVE_CHAIN,
      "ToString",
      "Number::toString",
      "ToNumeric",
      "ToNumber",
      "Number::add",
      "BigInt::add",
    ],
  },
  AbstractRelationalComparison: {
    call: (lhs, rhs, leftFirst) => AbstractRelationalComparison(lhs, rhs, leftFirst),
    algos: [
      "AbstractRelationalComparison",
      "Number::lessThan",
      ...TO_PRIMITIVE_CHAIN,
      "ToNumeric",
      "ToNumber",
    ],
  },
} satisfies Record<string, BinaryAlgorithm>;

export type BinaryAlgorithmName = keyof typeof BINARY_ALGORITHMS;

/** Run one equality/relational abstract operation by name. */
export function callBinaryAlgorithm(
  algoName: BinaryAlgorithmName,
  lhs: Value,
  rhs: Value,
  leftFirst: boolean = true,
): unknown {
  return BINARY_ALGORITHMS[algoName].call(lhs, rhs, leftFirst);
}

/**
 * Operators the BinaryExpression entry point accepts.
 * Order matters: longer operators MUST come first so "===" is matched before "==".
 */
export const EQUALITY_OPERATORS = ["===", "!==", "==", "!="] as const;
export const RELATIONAL_OPERATORS = ["<=", ">=", "<", ">"] as const;
export const ADDITIVE_OPERATORS = ["+"] as const;

export const COMPARISON_OPERATORS = [...EQUALITY_OPERATORS, ...RELATIONAL_OPERATORS] as const;

export const SUPPORTED_OPERATORS = [...COMPARISON_OPERATORS, ...ADDITIVE_OPERATORS] as const;
export type SupportedOperator = (typeof SUPPORTED_OPERATORS)[number];

export interface OperatorDispatch {
  /** Spec function actually executed for the trace. */
  algoName: BinaryAlgorithmName;
  /** Swap left and right operands before calling. */
  swap: boolean;
  /** LeftFirst argument for ARC (only used when algoName === "AbstractRelationalComparison"). */
  leftFirst: boolean;
  /** Post-process raw spec result to match operator semantics. */
  transform: (raw: Value) => Value;
}

function transformIdentity(raw: Value): Value {
  // For ==, ===, !=, !==: raw is Boolean; for <, >: ARC may return undefined → spec says false.
  if (raw === Value.undefined) return Value.false;
  return raw;
}
function transformNegate(raw: Value): Value {
  // For !=, !==: raw is Boolean.
  return raw === Value.true ? Value.false : Value.true;
}
function transformRaw(raw: Value): Value {
  return raw;
}
function transformLessOrEqual(raw: Value): Value {
  // For <=, >=: raw is BooleanValue | UndefinedValue. undefined OR true → false; else true.
  if (raw === Value.undefined || raw === Value.true) return Value.false;
  return Value.true;
}

export function getOperatorDispatch(operator: SupportedOperator): OperatorDispatch {
  switch (operator) {
    case "==":
      return { algoName: "IsLooselyEqual", swap: false, leftFirst: true, transform: transformIdentity };
    case "===":
      return { algoName: "IsStrictlyEqual", swap: false, leftFirst: true, transform: transformIdentity };
    case "!=":
      return { algoName: "IsLooselyEqual", swap: false, leftFirst: true, transform: transformNegate };
    case "!==":
      return { algoName: "IsStrictlyEqual", swap: false, leftFirst: true, transform: transformNegate };
    case "<":
      return { algoName: "AbstractRelationalComparison", swap: false, leftFirst: true, transform: transformIdentity };
    case ">":
      // a > b ≡ b < a (with LeftFirst=false to preserve evaluation order)
      return { algoName: "AbstractRelationalComparison", swap: true, leftFirst: false, transform: transformIdentity };
    case "<=":
      // a <= b ≡ !(b < a) treating undefined as false
      return { algoName: "AbstractRelationalComparison", swap: true, leftFirst: false, transform: transformLessOrEqual };
    case ">=":
      // a >= b ≡ !(a < b) treating undefined as false
      return { algoName: "AbstractRelationalComparison", swap: false, leftFirst: true, transform: transformLessOrEqual };
    case "+":
      return { algoName: "ApplyStringOrNumericBinaryOperator", swap: false, leftFirst: true, transform: transformRaw };
  }
}

// ── Spec clauses per entry point ─────────────────────────────────────────────

/**
 * BinaryExpression can dispatch to any of the three algorithms above and to any
 * numeric operation their operands drag in, so its panel is a curated reading
 * order rather than the union of the three lists.
 */
const NUMERIC_OPERATIONS = [
  "Number::add",
  "Number::subtract",
  "Number::multiply",
  "Number::divide",
  "Number::remainder",
  "Number::exponentiate",
  "Number::leftShift",
  "Number::signedRightShift",
  "Number::unsignedRightShift",
  "Number::bitwiseAND",
  "Number::bitwiseXOR",
  "Number::bitwiseOR",
  "NumberBitwiseOp",
  "Number::toString",
] as const;

const BINARY_EXPRESSION_ALGOS = [
  "IsLooselyEqual",
  "IsStrictlyEqual",
  "AbstractRelationalComparison",
  "ApplyStringOrNumericBinaryOperator",
  "SameValueNonNumber",
  "Number::equal",
  "BigInt::add",
  "Number::lessThan",
  ...NUMERIC_OPERATIONS,
  ...TO_PRIMITIVE_CHAIN,
  "ToNumeric",
  "ToNumber",
  "ToString",
] as const;

/** Which spec clauses each traceable entry point can reach, for the spec panel. */
export const FUNCTION_ALGOS: Record<string, readonly string[]> = {
  ...Object.fromEntries(Object.entries(UNARY_OPERATIONS).map(([name, op]) => [name, op.algos])),
  ...Object.fromEntries(Object.entries(BINARY_ALGORITHMS).map(([name, algo]) => [name, algo.algos])),
  BinaryExpression: BINARY_EXPRESSION_ALGOS,
};

export const SUPPORTED_SPEC_FUNCTIONS = Object.keys(FUNCTION_ALGOS);
