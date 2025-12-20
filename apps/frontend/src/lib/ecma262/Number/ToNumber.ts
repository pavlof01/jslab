import { ToPrimitive } from "../Object/ToPrimitive";
import { StringToNumber } from "../String/StringToNumber";

/**
 * ToNumber ( argument )
 *
 * The abstract operation ToNumber converts its argument to a value of type Number.
 *
 * Permalink: https://tc39.es/ecma262/multipage/abstract-operations.html#sec-tonumber
 */
export function ToNumber(argument: unknown): number {
  // Step 1: If argument is a Number, return argument.
  if (typeof argument === "number") {
    return argument;
  }

  // Step 2: If argument is either a Symbol or a BigInt, throw a TypeError exception.
  if (typeof argument === "symbol" || typeof argument === "bigint") {
    throw new TypeError("Cannot convert a Symbol or BigInt to a number");
  }

  // Step 3: If argument is undefined, return NaN.
  if (argument === undefined) {
    return NaN;
  }

  // Step 4: If argument is either null or false, return +0.
  if (argument === null || argument === false) {
    return 0;
  }

  // Step 5: If argument is true, return 1.
  if (argument === true) {
    return 1;
  }

  // Step 6: If argument is a String, return StringToNumber(argument).
  if (typeof argument === "string") {
    return StringToNumber(argument);
  }

  // Step 7: Assert: argument is an Object.
  // (At this point, it must be an object, since all other types are handled).

  // Step 8: Let primValue be ? ToPrimitive(argument, number).
  // The '?' means we propagate any exception thrown by ToPrimitive.
  const primValue = ToPrimitive(argument as object, "number");

  // Step 9: Assert: primValue is not an Object.

  // Step 10: Return ? ToNumber(primValue).
  // Recursively call ToNumber on the primitive value.
  return ToNumber(primValue);
}
