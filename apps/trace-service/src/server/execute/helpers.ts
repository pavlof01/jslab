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
 * Парсит строку и создает соответствующий ECMA262 Value
 *
 * Примеры:
 * - "1" → NumberValue(1)
 * - "'hello'" → JSStringValue("hello")
 * - "true" → BooleanValue(true)
 * - "null" → NullValue
 * - "undefined" → UndefinedValue
 * - "{ toString: () => '99' }" → ObjectValue с методом
 * - "[1, 2, 3]" → ObjectValue (массив)
 */
export function parseStringToValue(input: string, realm: ManagedRealm) {
  // Используем realm.evaluateScript для парсинга строки как JS выражения
  // Это безопасный способ, так как realm имеет свой контекст
  try {
    const result = realm.evaluateScript(input);
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
  "ToNumeric",
  "ToObject",
  "ToPropertyKey",
  "ToLength",
  "ToIndex",
  "ToInt32",
  "ToUint32",
  "ToInt8",
  "ToUint8",
  "ToUint8Clamp",
  "ToInt16",
  "ToUint16",
  "ToBigInt",
  "ToBigInt64",
  "ToBigUint64",
  "CanonicalNumericIndexString",
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

/**
 * Конвертирует входные данные в строку для realm.evaluateScript
 */
export function convertInputToString(inputCode: any): string {
  if (typeof inputCode === "string") {
    // String input - could be:
    // 1. A literal string like "abc" -> need to quote it as "'abc'"
    // 2. Valid JS code like "{ x: 1 }" -> use as-is
    // 3. A number string like "42" -> use as-is
    // Try to determine which by attempting to parse as JSON
    try {
      JSON.parse(inputCode);
      // Valid JSON - use as-is (includes strings like "\"abc\"", numbers "42", etc)
      return inputCode;
    } catch {
      // Not valid JSON - treat as literal string and quote it
      return JSON.stringify(inputCode);
    }
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
 * Вызывает ECMA262 функцию на основе имени
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
 * Конвертирует результат выполнения в строковое представление
 * Обрабатывает специальные случаи: NaN, Infinity, -Infinity
 */
export function convertResultToString(execResult: any): string {
  if (typeof execResult.value === "number") {
    // Handle special number values: NaN, Infinity, -Infinity
    return String(execResult.value);
  } else if (execResult.value === null) {
    // Explicit null
    return "null";
  } else if (execResult.value === undefined) {
    // Explicit undefined
    return "undefined";
  } else if (execResult.value instanceof Object) {
    // Objects/BigInt - convert to string via constructor or toString
    return String(execResult.value);
  } else {
    // Primitives: string, boolean, bigint
    return String(execResult.value);
  }
}
