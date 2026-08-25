export type TokenKind =
  | "Keyword"
  | "Identifier"
  | "NumericLiteral"
  | "StringLiteral"
  | "TemplateLiteral"
  | "RegExpLiteral"
  | "Operator"
  | "Punctuator"
  | "LineComment"
  | "BlockComment"
  | "Whitespace";

export type Token = {
  kind: TokenKind;
  value: string;
  start: number;
};

const KEYWORDS = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "null",
  "of",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "async",
  "await",
  "from",
  "as",
  "get",
  "set",
]);

// Multi-char operators, longest match first
const OPS3 = ["===", "!==", "**=", ">>>", "..."];
const OPS2 = [
  "==",
  "!=",
  "<=",
  ">=",
  "&&",
  "||",
  "??",
  "**",
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "=>",
  "<<",
  ">>",
  "?.",
  "??=",
  "||=",
  "&&=",
];

function tok(kind: TokenKind, value: string, start: number): Token {
  return { kind, value, start };
}

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  // Object property avoids TypeScript narrowing lastNonWS to `never` through
  // control-flow analysis across all the if/continue branches below.
  const state: { last: Token | null } = { last: null };

  function record(t: Token, isCode = true): Token {
    tokens.push(t);
    if (isCode) state.last = t;
    return t;
  }

  while (i < source.length) {
    const start = i;
    const ch = source[i] as string;

    // Whitespace
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      while (i < source.length && /\s/.test(source[i])) i++;
      record(tok("Whitespace", source.slice(start, i), start), false);
      continue;
    }

    // Line comment
    if (ch === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      record(tok("LineComment", source.slice(start, i), start));
      continue;
    }

    // Block comment
    if (ch === "/" && source[i + 1] === "*") {
      i += 2;
      while (i < source.length - 1 && !(source[i] === "*" && source[i + 1] === "/")) i++;
      i += 2;
      record(tok("BlockComment", source.slice(start, i), start));
      continue;
    }

    // String literals
    if (ch === '"' || ch === "'") {
      const q = ch;
      i++;
      while (i < source.length && source[i] !== q) {
        if (source[i] === "\\") i++;
        i++;
      }
      i++;
      record(tok("StringLiteral", source.slice(start, i), start));
      continue;
    }

    // Template literal (simplified – no nested ${} tracking)
    if (ch === "`") {
      i++;
      while (i < source.length && source[i] !== "`") {
        if (source[i] === "\\") i++;
        i++;
      }
      i++;
      record(tok("TemplateLiteral", source.slice(start, i), start));
      continue;
    }

    // Numeric literal
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(source[i + 1] ?? ""))) {
      if (ch === "0" && /[xX]/.test(source[i + 1] ?? "")) {
        i += 2;
        while (i < source.length && /[0-9a-fA-F_]/.test(source[i])) i++;
      } else if (ch === "0" && /[bB]/.test(source[i + 1] ?? "")) {
        i += 2;
        while (i < source.length && /[01_]/.test(source[i])) i++;
      } else if (ch === "0" && /[oO]/.test(source[i + 1] ?? "")) {
        i += 2;
        while (i < source.length && /[0-7_]/.test(source[i])) i++;
      } else {
        while (i < source.length && /[0-9_.]/.test(source[i])) i++;
        if (/[eE]/.test(source[i] ?? "")) {
          i++;
          if (/[+-]/.test(source[i] ?? "")) i++;
          while (i < source.length && /[0-9]/.test(source[i])) i++;
        }
        if (source[i] === "n") i++;
      }
      record(tok("NumericLiteral", source.slice(start, i), start));
      continue;
    }

    // Identifier / keyword
    if (/[a-zA-Z_$]/.test(ch)) {
      while (i < source.length && /[a-zA-Z0-9_$]/.test(source[i])) i++;
      const value = source.slice(start, i);
      record(tok(KEYWORDS.has(value) ? "Keyword" : "Identifier", value, start));
      continue;
    }

    // Regex literal – disambiguate from division
    if (ch === "/") {
      const prev = state.last;
      const afterExpr =
        prev !== null &&
        (prev.kind === "Identifier" ||
          prev.kind === "NumericLiteral" ||
          prev.value === ")" ||
          prev.value === "]" ||
          prev.value === "++" ||
          prev.value === "--");
      if (!afterExpr) {
        i++;
        while (i < source.length && source[i] !== "/" && source[i] !== "\n") {
          if (source[i] === "\\") i++;
          i++;
        }
        if (source[i] === "/") {
          i++;
          while (i < source.length && /[gimsuyv]/.test(source[i])) i++;
          record(tok("RegExpLiteral", source.slice(start, i), start));
          continue;
        }
        // Backtrack – treat as operator
        i = start;
      }
    }

    // Multi-char operators (longest match)
    const rem = source.slice(i);
    let matched = false;
    for (const op of OPS3) {
      if (rem.startsWith(op)) {
        record(tok("Operator", op, start));
        i += op.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      for (const op of OPS2) {
        if (rem.startsWith(op)) {
          record(tok("Operator", op, start));
          i += op.length;
          matched = true;
          break;
        }
      }
    }
    if (matched) continue;

    // Punctuators
    if ("()[]{},.;:".includes(ch)) {
      record(tok("Punctuator", ch, start));
      i++;
      continue;
    }

    // Single-char operators
    if ("+-*/%=!<>&|^~?@#".includes(ch)) {
      record(tok("Operator", ch, start));
      i++;
      continue;
    }

    // Skip unknown
    i++;
  }

  return tokens;
}
