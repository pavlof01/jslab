/**
 * ToObject ( argument )
 * https://tc39.es/ecma262/multipage/abstract-operations.html#sec-toobject
 *
 * Converts an ECMAScript language value to an Object, throwing for null/undefined.
 */
export function ToObject(argument: unknown): object {
  // Undefined → TypeError
  if (argument === undefined) {
    throw new TypeError("Cannot convert undefined to object");
  }

  // Null → TypeError
  if (argument === null) {
    throw new TypeError("Cannot convert null to object");
  }

  // Primitive wrappers; Object(argument) matches the spec tables for Boolean/Number/String/Symbol/BigInt.
  // If already an object, just return it.
  return Object(argument) as object;
}
