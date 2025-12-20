/**
 * BigInt::equal ( x, y )
 *
 * The abstract operation BigInt::equal takes arguments x (a BigInt) and y (a BigInt) and returns a Boolean.
 * It performs the following steps when called:
 *
 * 1. If ℝ(x) = ℝ(y), return true; otherwise return false.
 *
 * Permalink: https://262.ecma-international.org/16.0/index.html?_gl=1*12s2e4c*_ga*NjEyOTg1Mjk4LjE3NjA5NTg5MjQ.*_ga_TDCK4DWEPP*czE3NjQ1ODk3MzQkbzIkZzAkdDE3NjQ1ODk3MzQkajYwJGwwJGgw#sec-numeric-types-bigint-equal
 */
export function BigIntIsEqual(x: bigint, y: bigint): boolean {
  const xs = x.toString();
  const ys = y.toString();

  if (xs.length !== ys.length) return false;

  for (let i = 0; i < xs.length; i++) {
    if (xs[i] !== ys[i]) {
      return false;
    }
  }
  return true;
}
