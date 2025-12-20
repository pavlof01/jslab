import { BigIntIsEqual } from "./Number/BigIntIsEqual";
import { StringIsEqual } from "./String/StringIsEqual";
import { NonNumber } from "./types";

/**
 * SameValueNonNumber ( x, y )
 *
 * The abstract operation SameValueNonNumber takes arguments x (an ECMAScript language value, but not a Number)
 * and y (an ECMAScript language value, but not a Number) and returns a Boolean.
 * It performs the following steps when called:
 *
 * 1. Assert: SameType(x, y) is true.
 * 2. If x is either null or undefined, return true.
 * 3. If x is a BigInt, then
 *    a. Return BigInt::equal(x, y).
 * 4. If x is a String, then
 *    a. If x and y have the same length and the same code units in the same positions, return true; otherwise, return false.
 * 5. If x is a Boolean, then
 *    a. If x and y are both true or both false, return true; otherwise, return false.
 * 6. NOTE: All other ECMAScript language values are compared by identity.
 * 7. If x is y, return true; otherwise, return false.
 *
 * Permalink: https://262.ecma-international.org/16.0/index.html?_gl=1*12s2e4c*_ga*NjEyOTg1Mjk4LjE3NjA5NTg5MjQ.*_ga_TDCK4DWEPP*czE3NjQ1ODk3MzQkbzIkZzAkdDE3NjQ1ODk3MzQkajYwJGwwJGgw#sec-samevaluenonnumber
 */
export function SameValueNonNumber(x: NonNumber, y: NonNumber): boolean {
  // Step 1 Assert: SameType(x, y) is true.

  // Step 2: If x is either null or undefined, return true.
  // Since SameType(x, y) is true, y must be the same.
  if (x === null || x === undefined) {
    return true;
  }

  // check only x because SameType(x, y) is true, y must also be non-null or undefined.

  // Step 3: If x is a BigInt, use BigInt::equal.
  // Since SameType(x, y) is true, y must also be a BigInt.
  if (typeof x === "bigint") {
    return BigIntIsEqual(x as bigint, y as bigint);
  }

  // Step 4: If x is a String, use StringIsEqual.
  // Since SameType(x, y) is true, y must also be a String.
  if (typeof x === "string") {
    return StringIsEqual(x as string, y as string);
  }

  // Step 5: If x is a Boolean.
  // Since SameType(x, y) is true, y is also a boolean.
  if (typeof x === "boolean") {
    // "If x and y are both true or both false, return true; otherwise, return false."
    // This is equivalent to x === y.
    return x === y;
  }

  // Step 6 is just a comment that does not affect the implementation.

  // Steps 5, 7: For all other non-Number types (Boolean, Symbol, Object),

  return x === y;
}
