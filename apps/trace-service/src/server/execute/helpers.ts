import {
  AbstractRelationalComparison,
  CanonicalNumericIndexString,
  // Equality / relational
  IsLooselyEqual,
  IsStrictlyEqual,
  type ManagedRealm,
  ToBigInt,
  ToBigInt64,
  ToBigUint64,
  // Type conversion functions
  ToBoolean,
  ToIndex,
  ToInt8,
  ToInt16,
  ToInt32,
  ToLength,
  ToNumber,
  ToNumeric,
  ToObject,
  ToPrimitive,
  ToPropertyKey,
  ToString,
  ToUint8,
  ToUint8Clamp,
  ToUint16,
  ToUint32,
  // Helper functions
  Value,
} from "../../trace/index.mts";

export type FunctionCategory = "typeConversion" | "equality";

export interface FunctionMeta {
  category: FunctionCategory;
  /** "unary" → single input; "binary" → expression like "lhs OP rhs". */
  arity: "unary" | "binary";
  /** For binary functions: the operator string used to split the expression. */
  operator?: string;
}

export const FUNCTION_META: Record<string, FunctionMeta> = {
  ToNumber: { category: "typeConversion", arity: "unary" },
  ToNumeric: { category: "typeConversion", arity: "unary" },
  ToString: { category: "typeConversion", arity: "unary" },
  ToBoolean: { category: "typeConversion", arity: "unary" },
  ToPrimitive: { category: "typeConversion", arity: "unary" },
  ToObject: { category: "typeConversion", arity: "unary" },
  // Below already have both spec HTML (FUNCTION_ALGOS in spec-generator) and
  // execution (callECMA262Function); they were just never surfaced.
  ToPropertyKey: { category: "typeConversion", arity: "unary" },
  ToLength: { category: "typeConversion", arity: "unary" },
  ToIndex: { category: "typeConversion", arity: "unary" },
};

/**
 * Equality / relational operators supported by the BinaryExpression entry point.
 * Order matters: longer operators MUST come first so that "===" is matched before "==".
 */
export const SUPPORTED_OPERATORS = ["===", "!==", "==", "!=", "<=", ">=", "<", ">"] as const;
export type SupportedOperator = (typeof SUPPORTED_OPERATORS)[number];

export interface OperatorDispatch {
  /** Spec function actually executed for the trace. */
  algoName: "IsLooselyEqual" | "IsStrictlyEqual" | "AbstractRelationalComparison";
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
function transformLessOrEqual(raw: Value): Value {
  // For <=, >=: raw is BooleanValue | UndefinedValue. undefined OR true → false; else true.
  if (raw === Value.undefined || raw === Value.true) return Value.false;
  return Value.true;
}

export function getOperatorDispatch(operator: SupportedOperator): OperatorDispatch {
  switch (operator) {
    case "==":
      return {
        algoName: "IsLooselyEqual",
        swap: false,
        leftFirst: true,
        transform: transformIdentity,
      };
    case "===":
      return {
        algoName: "IsStrictlyEqual",
        swap: false,
        leftFirst: true,
        transform: transformIdentity,
      };
    case "!=":
      return {
        algoName: "IsLooselyEqual",
        swap: false,
        leftFirst: true,
        transform: transformNegate,
      };
    case "!==":
      return {
        algoName: "IsStrictlyEqual",
        swap: false,
        leftFirst: true,
        transform: transformNegate,
      };
    case "<":
      return {
        algoName: "AbstractRelationalComparison",
        swap: false,
        leftFirst: true,
        transform: transformIdentity,
      };
    case ">":
      // a > b ≡ b < a (with LeftFirst=false to preserve evaluation order)
      return {
        algoName: "AbstractRelationalComparison",
        swap: true,
        leftFirst: false,
        transform: transformIdentity,
      };
    case "<=":
      // a <= b ≡ !(b < a) treating undefined as false
      return {
        algoName: "AbstractRelationalComparison",
        swap: true,
        leftFirst: false,
        transform: transformLessOrEqual,
      };
    case ">=":
      // a >= b ≡ !(a < b) treating undefined as false
      return {
        algoName: "AbstractRelationalComparison",
        swap: false,
        leftFirst: true,
        transform: transformLessOrEqual,
      };
  }
}

/**
 * Scan `input` (top-level, ignoring strings & balanced brackets) and return the
 * leftmost supported operator. Returns null if none found.
 */
export function detectOperator(
  input: string,
): { operator: SupportedOperator; index: number } | null {
  const len = input.length;
  let i = 0;
  let inString: '"' | "'" | "`" | null = null;
  let depth = 0;
  while (i < len) {
    const ch = input[i];
    if (inString) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === inString) inString = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      i++;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      i++;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      i++;
      continue;
    }
    if (depth === 0) {
      // Skip arrow function token "=>" so "() => x" inside object literals isn't misread.
      if (input.startsWith("=>", i)) {
        i += 2;
        continue;
      }
      for (const op of SUPPORTED_OPERATORS) {
        if (input.startsWith(op, i)) {
          // Avoid matching "<" inside "<<" / "<=" already-handled prefix cases:
          // Operators in SUPPORTED_OPERATORS are sorted longest-first, so "==" only
          // matches when not followed by "=".
          return { operator: op, index: i };
        }
      }
    }
    i++;
  }
  return null;
}

/**
 * Parses a string and creates the corresponding ECMA262 Value
 *
 * Examples:
 * - "1" → NumberValue(1)
 * - "'hello'" → JSStringValue("hello")
 * - "true" → BooleanValue(true)
 * - "null" → NullValue
 * - "undefined" → UndefinedValue
 * - "{ toString: () => '99' }" → ObjectValue with a method
 * - "[1, 2, 3]" → ObjectValue (array)
 */
export function parseStringToValue(input: string, realm: ManagedRealm) {
  // Wrap in parens so that `{ ... }` is parsed as an object literal expression,
  // not as a block statement (which is what the JS parser does at statement level).
  const expr = `(${input})`;
  try {
    const result = realm.evaluateScript(expr);
    return result;
  } catch (error) {
    throw new Error(`Failed to parse input "${input}": ${error}`);
  }
}

export const AVAILABLE_FUNCTIONS = [
  "ToNumber",
  "ToNumeric",
  "ToString",
  "ToBoolean",
  "ToPrimitive",
  "ToObject",
  "ToPropertyKey",
  "ToLength",
  "ToIndex",
];

/**
 * Calls an ECMA262 function by name
 */
export function callECMA262Function(
  functionName: string,
  inputValue: Value,
  preferredType?: "string" | "number",
) {
  switch (functionName) {
    case "ToNumber":
      return ToNumber(inputValue);
    case "ToString":
      return ToString(inputValue);
    case "ToBoolean":
      return ToBoolean(inputValue);
    case "ToPrimitive":
      return ToPrimitive(inputValue, preferredType);
    case "ToNumeric":
      return ToNumeric(inputValue);
    case "ToObject":
      return ToObject(inputValue);
    case "ToPropertyKey":
      return ToPropertyKey(inputValue);
    case "ToLength":
      return ToLength(inputValue);
    case "ToIndex":
      return ToIndex(inputValue);
    case "ToInt32":
      return ToInt32(inputValue);
    case "ToUint32":
      return ToUint32(inputValue);
    case "ToInt8":
      return ToInt8(inputValue);
    case "ToUint8":
      return ToUint8(inputValue);
    case "ToUint8Clamp":
      return ToUint8Clamp(inputValue);
    case "ToInt16":
      return ToInt16(inputValue);
    case "ToUint16":
      return ToUint16(inputValue);
    case "ToBigInt":
      return ToBigInt(inputValue);
    case "ToBigInt64":
      return ToBigInt64(inputValue);
    case "ToBigUint64":
      return ToBigUint64(inputValue);
    case "CanonicalNumericIndexString":
      return CanonicalNumericIndexString(inputValue);
    default:
      throw new Error(`Unknown function: ${functionName}`);
  }
}

/**
 * Calls an underlying equality / relational abstract operation. Returns a generator
 * (sync ops are wrapped in a degenerate generator so callGenerator works uniformly).
 */
export function callECMA262BinaryFunction(
  algoName: "IsLooselyEqual" | "IsStrictlyEqual" | "AbstractRelationalComparison",
  lhs: Value,
  rhs: Value,
  leftFirst: boolean = true,
) {
  switch (algoName) {
    case "IsLooselyEqual":
      return IsLooselyEqual(lhs, rhs);
    case "IsStrictlyEqual":
      // IsStrictlyEqual is synchronous; wrapping it in a generator that never
      // yields is what lets callGenerator drive all three branches identically.
      // biome-ignore lint/correctness/useYield: degenerate generator, see above.
      return (function* () {
        return IsStrictlyEqual(lhs, rhs);
      })();
    case "AbstractRelationalComparison":
      return AbstractRelationalComparison(lhs, rhs, leftFirst);
  }
}
