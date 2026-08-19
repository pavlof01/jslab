import { evalQ, inspect, NormalCompletion, ThrowCompletion, type ManagedRealm, type Value } from "../../trace/index.mts";
import { SUPPORTED_OPERATORS, type SupportedOperator } from "../operations.ts";

/**
 * Turning request text into something executable: finding the operator in a
 * binary expression, and evaluating an operand into an engine262 Value. Which
 * abstract operation then runs is the operations registry's business, not this
 * module's.
 */

/**
 * Scan `input` (top-level, ignoring strings & balanced brackets) and return the
 * leftmost supported operator. Returns null if none found.
 */
export function detectOperator(input: string): { operator: SupportedOperator; index: number } | null {
  const len = input.length;
  let i = 0;
  let inString: '"' | "'" | "`" | null = null;
  let depth = 0;
  while (i < len) {
    const ch = input[i];
    if (inString) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === inString) inString = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      i++;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      i++;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      i++;
      continue;
    }
    if (depth === 0) {
      // Skip arrow function token "=>" so "() => x" inside object literals isn't misread.
      if (input.startsWith("=>", i)) {
        i += 2;
        continue;
      }
      for (const op of SUPPORTED_OPERATORS) {
        if (input.startsWith(op, i)) {
          // Avoid matching "<" inside "<<" / "<=" already-handled prefix cases:
          // Operators in SUPPORTED_OPERATORS are sorted longest-first, so "==" only
          // matches when not followed by "=".
          return { operator: op, index: i };
        }
      }
    }
    i++;
  }
  return null;
}

/**
 * Parses a string and creates the corresponding ECMA262 Value
 *
 * Examples:
 * - "1" → NumberValue(1)
 * - "'hello'" → JSStringValue("hello")
 * - "true" → BooleanValue(true)
 * - "null" → NullValue
 * - "undefined" → UndefinedValue
 * - "{ toString: () => '99' }" → ObjectValue with a method
 * - "[1, 2, 3]" → ObjectValue (array)
 */
export function parseStringToValue(input: string, realm: ManagedRealm) {
  // Wrap in parens so that `{ ... }` is parsed as an object literal expression,
  // not as a block statement (which is what the JS parser does at statement level).
  const expr = `(${input})`;
  try {
    const result = realm.evaluateScript(expr);
    return result;
  } catch (error) {
    // engine262 throws a ThrowCompletion; the SyntaxError itself is its Value.
    const thrown = error instanceof ThrowCompletion ? error.Value : (error as Value);
    throw new Error(`Failed to parse input "${input}": ${describeValue(thrown, realm)}`);
  }
}

/**
 * What a thrown value says about itself.
 *
 * `String(value)` on an engine262 object gives "[object Object]", which tells a
 * caller nothing about the TypeError it just triggered. `inspect` renders the
 * value the way the engine would, but it uses the X() shorthand, which only
 * exists while an evalQ is on the stack — hence its own evalQ, and the realm
 * scope for the intrinsics it reads.
 */
export function describeValue(value: Value, realm?: ManagedRealm): string {
  const render = () => evalQ(() => inspect(value));
  try {
    const completion = realm ? realm.scope(render) : render();
    if (completion instanceof NormalCompletion) return String(completion.Value).trim();
  } catch {
    // Fall through: a bare type name still beats "[object Object]".
  }
  return (value as { type?: string })?.type ? `[${(value as { type?: string }).type}]` : String(value);
}
