/**
 * Number::sameValue ( x, y )
 *
 * The abstract operation Number::sameValue takes arguments x (a Number) and y (a Number) and returns a Boolean.
 * It performs the following steps when called:
 *
 * 1. If x is NaN and y is NaN, return true.
 * 2. If x is +0𝔽 and y is -0𝔽, return false.
 * 3. If x is -0𝔽 and y is +0𝔽, return false.
 * 4. If x is the same Number value as y, return true.
 * 5. Return false.
 *
 * NOTE: This is equivalent to the specification of the SameValue algorithm for the Number type,
 * which is implemented by `Object.is()`.
 *
 * Permalink: https://262.ecma-international.org/16.0/index.html?_gl=1*12s2e4c*_ga*NjEyOTg1Mjk4LjE3NjA5NTg5MjQ.*_ga_TDCK4DWEPP*czE3NjQ1ODk3MzQkbzIkZzAkdDE3NjQ1ODk3MzQkajYwJGwwJGgw#sec-numeric-types-number-sameValue
 */
export function NumberSameValue(x: number, y: number): boolean {
  // Step 1: If x is NaN and y is NaN, return true.
  if (Number.isNaN(x) && Number.isNaN(y)) {
    return true;
  }

  // A simple way to distinguish +0 from -0 is by taking their inverse.
  // 1 / +0 evaluates to Infinity.
  // 1 / -0 evaluates to -Infinity.
  const isPlusZero = (n: number) => n === 0 && 1 / n === Infinity;
  const isMinusZero = (n: number) => n === 0 && 1 / n === -Infinity;

  // Step 2: If x is +0 and y is -0, return false.
  if (isPlusZero(x) && isMinusZero(y)) {
    return false;
  }

  // Step 3: If x is -0 and y is +0, return false.
  if (isMinusZero(x) && isPlusZero(y)) {
    return false;
  }

  // Step 4: If x is the same Number value as y, return true.
  // The `===` operator handles all other cases correctly:
  // - It returns true for two equal numbers (including Infinity).
  // - It returns false for two different numbers.
  // - It returns true for `+0 === +0` and `-0 === -0`.
  // - It returns false for `NaN === anything`.
  if (x === y) {
    return true;
  }

  // Step 5: Return false.
  // This will catch cases like `NumberSameValue(5, NaN)` or `NumberSameValue(1, 2)`.
  return false;
}
