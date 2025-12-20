import { ToPrimitive } from "../Object/ToPrimitive";
import { ToNumber } from "./ToNumber";

/**
 * ToNumeric ( value )
 * https://tc39.es/ecma262/multipage/abstract-operations.html#sec-tonumeric
 *
 * Converts a value to either Number or BigInt, following the spec order.
 */
export function ToNumeric(value: unknown): number | bigint {
  // 1. Let primValue be ? ToPrimitive(value, number).
  const primValue = ToPrimitive(value, "number");

  // 2. If primValue is a BigInt, return primValue.
  if (typeof primValue === "bigint") {
    return primValue;
  }

  // 3. Return ? ToNumber(primValue).
  return ToNumber(primValue);
}
