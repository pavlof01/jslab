import {
  evalQ,
  inspect,
  type ManagedRealm,
  NormalCompletion,
  ThrowCompletion,
  type Value,
} from "../../trace/index.mts";
import {
  ADDITIVE_OPERATORS,
  EQUALITY_OPERATORS,
  RELATIONAL_OPERATORS,
  type SupportedOperator,
} from "../operations.ts";

/**
 * Turning request text into something executable: finding the operator in a
 * binary expression, and evaluating an operand into an engine262 Value. Which
 * abstract operation then runs is the operations registry's business, not this
 * module's.
 */

const OPERAND_EXPECTED = /[+\-*/%<>=!&|^~([{,:?;]/;

const WORD_UNARY = new Set([
  "typeof",
  "void",
  "delete",
  "new",
  "in",
  "instanceof",
  "await",
  "yield",
]);

const IDENT_CHAR = /[A-Za-z0-9_$]/;

function isUnaryPosition(input: string, index: number): boolean {
  let i = index - 1;
  while (i >= 0 && /\s/.test(input[i])) i--;
  if (i < 0) return true;

  const prev = input[i];
  if (OPERAND_EXPECTED.test(prev)) return true;

  if (prev === "e" || prev === "E") {
    let j = i - 1;
    const digitsStart = j;
    while (j >= 0 && /[\d_]/.test(input[j])) j--;
    if (j >= 0 && input[j] === ".") {
      j--;
      while (j >= 0 && /[\d_]/.test(input[j])) j--;
    }
    const sawDigits = j < digitsStart;
    const tokenStartsHere = j < 0 || !IDENT_CHAR.test(input[j]);
    if (sawDigits && tokenStartsHere) return true;
  }

  if (!/[A-Za-z_$]/.test(prev)) return false;

  let start = i;
  while (start >= 0 && IDENT_CHAR.test(input[start])) start--;
  return WORD_UNARY.has(input.slice(start + 1, i + 1));
}

const firstChars = (operators: readonly string[]) => new Set(operators.map((op) => op[0]));
const EQUALITY_FIRST = firstChars(EQUALITY_OPERATORS);
const RELATIONAL_FIRST = firstChars(RELATIONAL_OPERATORS);
const ADDITIVE_FIRST = firstChars(ADDITIVE_OPERATORS);

function skipRegexLiteral(input: string, index: number): number {
  let i = index + 1;
  let inClass = false;
  while (i < input.length) {
    const ch = input[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "[") inClass = true;
    else if (ch === "]") inClass = false;
    else if (ch === "/" && !inClass) {
      i++;
      break;
    }
    i++;
  }
  while (i < input.length && /[a-z]/i.test(input[i])) i++;
  return i;
}

export function detectOperator(
  input: string,
): { operator: SupportedOperator; index: number } | null {
  const len = input.length;
  let i = 0;
  let inString: '"' | "'" | "`" | null = null;
  let depth = 0;
  let equality: { operator: SupportedOperator; index: number } | null = null;
  let relational: { operator: SupportedOperator; index: number } | null = null;
  let additive: { operator: SupportedOperator; index: number } | null = null;

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
    if (ch === "/" && isUnaryPosition(input, i)) {
      i = skipRegexLiteral(input, i);
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
      if (EQUALITY_FIRST.has(ch)) {
        const op = EQUALITY_OPERATORS.find((candidate) => input.startsWith(candidate, i));
        if (op) {
          equality = { operator: op, index: i };
          i += op.length;
          continue;
        }
      }
      if (RELATIONAL_FIRST.has(ch)) {
        const op = RELATIONAL_OPERATORS.find((candidate) => input.startsWith(candidate, i));
        if (op) {
          relational = { operator: op, index: i };
          i += op.length;
          continue;
        }
      }
      if (ADDITIVE_FIRST.has(ch) && input[i + 1] !== ch && !isUnaryPosition(input, i)) {
        const op = ADDITIVE_OPERATORS.find((candidate) => input.startsWith(candidate, i));
        if (op) {
          additive = { operator: op, index: i };
          i += op.length;
          continue;
        }
      }
    }
    i++;
  }

  return equality ?? relational ?? additive;
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
    throw new Error(`Failed to parse input "${input}": ${describeValue(thrown, realm)}`, {
      cause: error,
    });
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
  return (value as { type?: string })?.type
    ? `[${(value as { type?: string }).type}]`
    : String(value);
}
