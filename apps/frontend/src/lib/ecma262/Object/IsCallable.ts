/**
 * IsCallable ( argument )
 * https://tc39.es/ecma262/#sec-iscallable
 *
 * In JS engines, a callable value is an Object with a [[Call]] internal method.
 * The nearest observable test is `typeof value === "function"`; this covers
 * standard callables and proxies to callables.
 */
export function IsCallable(argument: unknown): argument is (...args: unknown[]) => unknown {
  if (typeof argument !== "object" && typeof argument !== "function") {
    return false;
  }

  // In JS, functions and callable proxies report typeof === "function".
  // Non-callable objects (including class instances) will be "object".
  return typeof argument === "function";
}
