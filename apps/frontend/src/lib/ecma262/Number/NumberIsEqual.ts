/**
 * Number::equal ( x, y )
 *
 * The abstract operation Number::equal takes arguments x (a Number) and y (a Number) and returns a Boolean.
 * It performs the following steps when called:
 *
 * 1. If x is NaN, return false.
 * 2. If y is NaN, return false.
 * 3. If x is the same Number value as y, return true.
 * 4. If x is +0𝔽 and y is -0𝔽, return true.
 * 5. If x is -0𝔽 and y is +0𝔽, return true.
 * 6. Return false.
 *
 * Permalink: https://262.ecma-international.org/16.0/index.html?_gl=1*12s2e4c*_ga*NjEyOTg1Mjk4LjE3NjA5NTg5MjQ.*_ga_TDCK4DWEPP*czE3NjQ1ODk3MzQkbzIkZzAkdDE3NjQ1ODk3MzQkajYwJGwwJGgw#sec-numeric-types-number-equal
 */
export function NumberIsEqual(x: number, y: number): boolean {
  // 1. If x is NaN, return false.
  if (Number.isNaN(x)) {
    return false;
  }

  // 2. If y is NaN, return false.
  if (Number.isNaN(y)) {
    return false;
  }

  // 4. If x is +0𝔽 and y is -0𝔽, return true.
  // 5. If x is -0𝔽 and y is +0𝔽, return true.
  // This also covers the case where x and y are both +0 or both -0.
  //TODO: should use EqualityExpression : EqualityExpression == RelationalExpression?
  if (x == 0 && y == 0) {
    return true;
  }

  // 3. If x is the same Number value as y, return true.
  // At this point, we've handled NaN and +/-0 cases.
  // We can use `==` for other numbers as it will behave like `===`.
  if (x == y) {
    return true;
  }

  // 6. Return false.
  return false;
}
