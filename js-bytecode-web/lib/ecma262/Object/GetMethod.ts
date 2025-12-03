/**
 * GetMethod ( V, P )
 * https://tc39.es/ecma262/#sec-getmethod
 *
 * Minimal implementation:
 * - Throws if V is null/undefined.
 * - Returns undefined if the property is null/undefined.
 * - Throws TypeError if the property exists and is not callable.
 * - Otherwise returns the function.
 */
export function GetMethod<V extends object, K extends PropertyKey>(
  value: V | null | undefined,
  key: K
): Function | undefined {
  // Step 1. Let func be ? GetV(V, P). (effectively property access with TypeError on null/undefined)
  if (value === null || value === undefined) {
    throw new TypeError("Cannot read property of null or undefined");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const func = (value as any)[key];

  // Step 2. If func is either undefined or null, return undefined.
  if (func === undefined || func === null) {
    return undefined;
  }

  // Step 3. If IsCallable(func) is false, throw a TypeError exception.
  if (typeof func !== "function") {
    throw new TypeError("Property is not callable");
  }

  // Step 4. Return func.
  return func;
}
