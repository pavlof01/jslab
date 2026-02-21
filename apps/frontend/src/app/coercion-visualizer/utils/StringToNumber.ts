export function StringToNumber(str: string): number {
  if (typeof str !== "string") {
    throw new TypeError(`StringToNumber expects a string, received ${typeof str}`);
  }
  return Number(str);
}
