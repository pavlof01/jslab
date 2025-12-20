import { SameType } from "./SameType";
import { IsStrictlyEqual } from "./IsStrictlyEqual";
import { ToNumber } from "./Number/ToNumber";
import { ToPrimitive } from "./Object/ToPrimitive";

/**
 * IsLooselyEqual ( x, y )
 * https://tc39.es/ecma262/multipage/abstract-operations.html#sec-islooselyequal
 *
 * Provides the semantics of the == operator.
 */
export function IsLooselyEqual(x: unknown, y: unknown): boolean {
  // 1. If SameType(x, y) is true, then return IsStrictlyEqual(x, y).
  if (SameType(x, y)) {
    return IsStrictlyEqual(x, y);
  }

  // 2. If x is null and y is undefined, return true.
  if (x === null && y === undefined) {
    return true;
  }

  // 3. If x is undefined and y is null, return true.
  if (x === undefined && y === null) {
    return true;
  }

  // 4. (Note: Annex B replacement not implemented here.)

  // 5. If x is a Number and y is a String, return ! IsLooselyEqual(x, ! ToNumber(y)).
  if (typeof x === "number" && typeof y === "string") {
    return IsLooselyEqual(x, ToNumber(y));
  }

  // 6. If x is a String and y is a Number, return ! IsLooselyEqual(! ToNumber(x), y).
  if (typeof x === "string" && typeof y === "number") {
    return IsLooselyEqual(ToNumber(x), y);
  }

  // 7. If x is a BigInt and y is a String...
  if (typeof x === "bigint" && typeof y === "string") {
    const n = StringToBigIntOrUndefined(y);
    if (n === undefined) return false;
    return IsLooselyEqual(x, n);
  }

  // 8. If x is a String and y is a BigInt, return ! IsLooselyEqual(y, x).
  if (typeof x === "string" && typeof y === "bigint") {
    return IsLooselyEqual(y, x);
  }

  // 9. If x is a Boolean, return ! IsLooselyEqual(! ToNumber(x), y).
  if (typeof x === "boolean") {
    return IsLooselyEqual(ToNumber(x), y);
  }

  // 10. If y is a Boolean, return ! IsLooselyEqual(x, ! ToNumber(y)).
  if (typeof y === "boolean") {
    return IsLooselyEqual(x, ToNumber(y));
  }

  // 11. If x is a String, Number, BigInt, or Symbol and y is an Object, compare to ToPrimitive(y).
  if (isPrimitiveTypeForObjectCompare(x) && isObject(y)) {
    const prim = ToPrimitive(y, "number");
    return IsLooselyEqual(x, prim);
  }

  // 12. If x is an Object and y is a String, Number, BigInt, or Symbol, compare ToPrimitive(x) to y.
  if (isObject(x) && isPrimitiveTypeForObjectCompare(y)) {
    const prim = ToPrimitive(x, "number");
    return IsLooselyEqual(prim, y);
  }

  // 13. If x is BigInt and y is Number, or vice versa
  if (
    (typeof x === "bigint" && typeof y === "number") ||
    (typeof x === "number" && typeof y === "bigint")
  ) {
    // a. If x is not finite or y is not finite, return false.
    if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) {
      return false;
    }

    // b. If ℝ(x) = ℝ(y), return true; otherwise return false.
    return Number(x) === Number(y);
  }

  // 14. Return false.
  return false;
}

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function isPrimitiveTypeForObjectCompare(value: unknown): value is string | number | bigint | symbol {
  const t = typeof value;
  return t === "string" || t === "number" || t === "bigint" || t === "symbol";
}

function StringToBigIntOrUndefined(str: string): bigint | undefined {
  try {
    return BigInt(str);
  } catch {
    return undefined;
  }
}
