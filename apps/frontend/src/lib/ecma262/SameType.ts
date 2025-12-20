export function SameType(x: unknown, y: unknown): boolean {
  // Step 1: If x is undefined and y is undefined
  if (x === undefined && y === undefined) return true;

  // Step 2: If x is null and y is null
  if (x === null && y === null) return true;

  // Step 3: If x is a Boolean and y is a Boolean
  if (typeof x === "boolean" && typeof y === "boolean") return true;

  // Step 4: If x is a Number and y is a Number
  if (typeof x === "number" && typeof y === "number") return true;

  // Step 5: If x is a BigInt and y is a BigInt
  if (typeof x === "bigint" && typeof y === "bigint") return true;

  // Step 6: If x is a Symbol and y is a Symbol
  if (typeof x === "symbol" && typeof y === "symbol") return true;

  // Step 7: If x is a String and y is a String
  if (typeof x === "string" && typeof y === "string") return true;

  // Step 8: If x is an Object and y is an Object
  // (includes functions, arrays, proxies, and non-null objects)
  if (typeof x === "object" && typeof y === "object") {
    if (x !== null && y !== null) return true;
  }

  // Step 9: Otherwise false
  return false;
}
