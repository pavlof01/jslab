import { SameType } from "./SameType";
import { NumberIsEqual } from "./Number/NumberIsEqual";
import { SameValueNonNumber } from "./SameValueNonNumber";
import { NonNumber } from "./types";

/**
 * IsStrictlyEqual ( x, y )
 *
 * The abstract operation IsStrictlyEqual takes arguments x (an ECMAScript language value)
 * and y (an ECMAScript language value) and returns a Boolean. It provides the semantics
 * for the === operator. It performs the following steps when called:
 *
 * 1. If SameType(x, y) is false, return false.
 * 2. If x is a Number, then
 *    a. Return Number::equal(x, y).
 * 3. Return SameValueNonNumber(x, y).
 *
 * Permalink: https://262.ecma-international.org/16.0/index.html?_gl=1*12s2e4c*_ga*NjEyOTg1Mjk4LjE3NjA5NTg5MjQ.*_ga_TDCK4DWEPP*czE3NjQ1ODk3MzQkbzIkZzAkdDE3NjQ1ODk3MzQkajYwJGwwJGgw#sec-isstrictlyequal
 */
export function IsStrictlyEqual(x: unknown, y: unknown): boolean {
  // Step 1: If SameType(x, y) is false, return false.
  if (!SameType(x, y)) {
    return false;
  }

  // Step 2: If x is a Number, then return Number::equal(x, y).
  if (typeof x === "number") {
    // SameType ensures y is also a number.
    return NumberIsEqual(x, y as number);
  }

  // Step 3: Return SameValueNonNumber(x, y).
  // At this point, x and y are of the same type, and they are not Numbers.
  return SameValueNonNumber(x as NonNumber, y as NonNumber);
}
