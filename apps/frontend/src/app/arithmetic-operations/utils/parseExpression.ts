/**
 * Very small parser for expressions like "left + right" (single top-level "+").
 * Handles simple nesting/brackets/strings to find the top-level plus.
 */
export function splitPlusExpression(expr: string): { left: string; right: string } | null {
  eval
  let depth = 0;
  let inString: string | null = null;
  let prev = "";
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (inString) {
      if (ch === inString && prev !== "\\") inString = null;
      prev = ch;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      prev = ch;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    if (ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
    if (ch === "+" && depth === 0) {
      return { left: expr.slice(0, i).trim(), right: expr.slice(i + 1).trim() };
    }
    prev = ch;
  }
  return null;
}

export function evalOperand(src: string): unknown {
  // Best-effort evaluation; user-controlled code.
  // eslint-disable-next-line no-new-func
  const fn = new Function(`"use strict"; return (${src});`);
  return fn();
}
