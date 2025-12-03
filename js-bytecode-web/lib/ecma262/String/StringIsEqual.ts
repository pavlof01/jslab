/**
 * String::equal ( x, y )
 *
 * The abstract operation String::equal takes arguments x (a String) and y (a String) and returns a Boolean.
 * It performs the following steps when called:
 *
 * 1. If x and y have the same length and the same code units in the same positions, return true; otherwise, return false.
 *
 * NOTE: This is directly implemented by the `===` operator for strings in JavaScript.
 *
 */
export function StringIsEqual(x: string, y: string): boolean {
  if (x.length !== y.length) {
    return false;
  }

  for (let i = 0; i < x.length; i++) {
    if (x.charCodeAt(i) !== y.charCodeAt(i)) {
      return false;
    }
  }

  return true;
}
