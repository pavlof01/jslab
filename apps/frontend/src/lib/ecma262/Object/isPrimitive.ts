/**
 * Checks if a value is a primitive type (i.e., not an Object).
 */
export function isPrimitive(value: unknown): boolean {
  if (value === null) return true;
  const type = typeof value;
  return type !== "object" && type !== "function";
}
