/**
 * StringToNumber ( str )
 * https://tc39.es/ecma262/#sec-stringtonumber
 *
 * The abstract operation StringToNumber takes argument str (a String) and returns a Number. It performs the following steps when called:
 * Uses the built-in Number conversion, which mirrors the spec's StringNumericLiteral parsing.
 */
export function StringToNumber(str: string): number {
  // ParseText / StringNumericValue are not directly exposed; Number() follows the same rules.
  const result = Number(str);
  return result;
}
