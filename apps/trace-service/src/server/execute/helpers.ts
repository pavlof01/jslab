import {
  // Type conversion functions
  ToBoolean,
  ToNumber,
  ToString,
  ToNumeric,
  ToObject,
  ToPrimitive,
  ToPropertyKey,
  ToLength,
  ToIndex,
  ToInt32,
  ToUint32,
  ToInt8,
  ToUint8,
  ToUint8Clamp,
  ToInt16,
  ToUint16,
  ToBigInt,
  ToBigInt64,
  ToBigUint64,
  CanonicalNumericIndexString,
  // Helper functions
  Value,
  ManagedRealm,
} from "../../trace/index.mts";

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
  "ToString",
  "ToBoolean",
  "ToPrimitive",
  "ToObject",
];

// Mapping of function names to their implementations
export const FUNCTION_MAP: Record<string, any> = {
  ToNumber,
  ToString,
  ToBoolean,
  ToPrimitive,
  ToNumeric,
  ToObject,
  ToPropertyKey,
  ToLength,
  ToIndex,
  ToInt32,
  ToUint32,
  ToInt8,
  ToUint8,
  ToUint8Clamp,
  ToInt16,
  ToUint16,
  ToBigInt,
  ToBigInt64,
  ToBigUint64,
  CanonicalNumericIndexString,
};

export function isFunctionNameValid(name: string): boolean {
  return AVAILABLE_FUNCTIONS.includes(name);
}

function looksLikeEcmaExpression(input: string): boolean {
  const trimmed = input.trim();

  if (trimmed === "") return false;
  if (
    trimmed === "true" ||
    trimmed === "false" ||
    trimmed === "null" ||
    trimmed === "undefined" ||
    trimmed === "NaN" ||
    trimmed === "Infinity" ||
    trimmed === "-Infinity"
  ) {
    return true;
  }

  if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) {
    return true;
  }

  const firstChar = trimmed[0];
  return firstChar === "{" || firstChar === "[" || firstChar === "(" || firstChar === "\"" || firstChar === "'";
}

/**
 * Converts input data to a string for realm.evaluateScript
 */
export function convertInputToString(inputCode: any): string {
  if (typeof inputCode === "string") {
    // String input - could be:
    // 1. A literal string like "abc" -> need to quote it as "'abc'"
    // 2. Valid JS code like "{ x: 1 }" -> use as-is
    // 3. A number string like "42" -> use as-is
    // Try to determine which by attempting to parse as JSON
    const trimmed = inputCode.trim();
    if (looksLikeEcmaExpression(trimmed)) {
      return trimmed;
    }

    // Plain unquoted text like hello should be treated as a string literal.
    return JSON.stringify(inputCode);
  } else if (inputCode === null) {
    // null
    return "null";
  } else if (inputCode === undefined) {
    // undefined
    return "undefined";
  } else if (typeof inputCode === "number") {
    // Number - handle special cases
    if (Number.isNaN(inputCode)) {
      return "NaN";
    } else if (!Number.isFinite(inputCode)) {
      return inputCode > 0 ? "Infinity" : "-Infinity";
    } else {
      return String(inputCode);
    }
  } else if (typeof inputCode === "boolean") {
    // Boolean
    return String(inputCode);
  } else {
    // Object, array, or other complex type
    return JSON.stringify(inputCode);
  }
}

/**
 * Calls an ECMA262 function by name
 */
export function callECMA262Function(functionName: string, inputValue: Value, preferredType?: "string" | "number"): any {
  switch (functionName) {
    case "ToNumber":
      return ToNumber(inputValue);
    case "ToString":
      return ToString(inputValue);
    case "ToBoolean":
      return ToBoolean(inputValue);
    case "ToPrimitive":
      return ToPrimitive(inputValue, preferredType as "string" | "number" | undefined);
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
 * Converts an ECMA262 Value to its string representation.
 * execResult is a Value from the engine (NumberValue, JSStringValue, etc.)
 */
export function convertResultToString(execResult: any): string {
  if (!execResult || typeof execResult !== "object") {
    return String(execResult);
  }
  switch (execResult.type) {
    case "Number":  return String(execResult.value);
    case "String":  return typeof execResult.stringValue === "function" ? execResult.stringValue() : String(execResult.value ?? "");
    case "Boolean": return execResult === Value.true ? "true" : "false";
    case "BigInt":  return String(execResult.value);
    case "Null":    return "null";
    case "Undefined": return "undefined";
    default:        return String(execResult);
  }
}
