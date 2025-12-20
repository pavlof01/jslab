import { isPrimitive } from "./isPrimitive";

/**
 * OrdinaryToPrimitive ( O, hint )
 * https://tc39.es/ecma262/#sec-ordinarytoprimitive
 */
export function OrdinaryToPrimitive(O: object, hint: "string" | "number"): any {
  // 3. If hint is "string", let methodNames be « "toString", "valueOf" ».
  // 4. Else, let methodNames be « "valueOf", "toString" ».
  const methodNames = hint === "string" ? ["toString", "valueOf"] : ["valueOf", "toString"];

  // 5. For each name in methodNames, in order, do
  for (const name of methodNames) {
    // a. Let method be ? Get(O, name).
    const method = (O as any)[name];

    // b. If IsCallable(method) is true, then
    if (typeof method === "function") {
      // i. Let result be ? Call(method, O).
      const result = method.call(O);

      // ii. If result is not an Object, return result.
      if (isPrimitive(result)) {
        return result;
      }
    }
  }

  // 6. Throw a TypeError exception.
  throw new TypeError("Cannot convert object to primitive value");
}
