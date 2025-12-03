import { GetMethod } from "./GetMethod";
import { isPrimitive } from "./isPrimitive";
import { OrdinaryToPrimitive } from "./OrdinaryToPrimitive";

/**
 * ToPrimitive ( input [ , preferredType ] )
 *
 * The abstract operation ToPrimitive converts its input argument to a non-Object type.
 *
 * Permalink: https://tc39.es/ecma262/multipage/abstract-operations.html#sec-toprimitive
 */
export function ToPrimitive(input: unknown, preferredType?: "string" | "number"): any {
  // 2. Return input. (If it's not an object)
  if (typeof input !== "object" || input === null) {
    return input;
  }

  // 1. If input is an Object, then
  // a. Let exoticToPrim be ? GetMethod(input, %Symbol.toPrimitive%).
  const exoticToPrim = GetMethod(input, Symbol.toPrimitive);

  // b. If exoticToPrim is not undefined, then
  if (exoticToPrim !== undefined) {
    let hint: "string" | "number" | "default";
    // i. If preferredType is not present, let hint be "default".
    if (!preferredType) {
      hint = "default";
      // ii. Else if preferredType is string, let hint be "string".
    } else if (preferredType === "string") {
      hint = "string";
      // iii. Else, let hint be "number".
    } else {
      hint = "number";
    }

    // iv. Let result be ? Call(exoticToPrim, input, « hint »).
    const result = exoticToPrim.call(input, hint);

    // v. If result is not an Object, return result.
    if (isPrimitive(result)) {
      return result;
    }

    // vi. Throw a TypeError exception.
    throw new TypeError("Cannot convert object to primitive value");
  }

  // c. If preferredType is not present, let preferredType be number.
  if (!preferredType) {
    preferredType = "number";
  }

  // d. Return ? OrdinaryToPrimitive(input, preferredType).
  return OrdinaryToPrimitive(input, preferredType);
}
