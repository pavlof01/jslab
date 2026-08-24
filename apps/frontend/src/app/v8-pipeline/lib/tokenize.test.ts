import { describe, expect, it } from "@jest/globals";
import { tokenize } from "./tokenize";

const kinds = (src: string) => tokenize(src).map((t) => t.kind);
const values = (src: string) => tokenize(src).map((t) => t.value);

describe("tokenize", () => {
  it("classifies keywords, identifiers and numeric literals", () => {
    const toks = tokenize("const x = 42");
    expect(toks.find((t) => t.value === "const")?.kind).toBe("Keyword");
    expect(toks.find((t) => t.value === "x")?.kind).toBe("Identifier");
    expect(toks.find((t) => t.value === "42")?.kind).toBe("NumericLiteral");
  });

  it("does not treat a non-keyword identifier as a keyword", () => {
    const toks = tokenize("constant");
    expect(toks.find((t) => t.value === "constant")?.kind).toBe("Identifier");
  });

  it("matches longest multi-char operators first", () => {
    expect(kinds("a === b")).toContain("Operator");
    expect(values("a === b")).toContain("===");
    // Must not split into "==" + "=".
    expect(values("a === b")).not.toContain("==");
  });

  it("captures string and template literals as single tokens", () => {
    expect(values('"hi"')).toContain('"hi"');
    expect(values("`t`")).toContain("`t`");
  });

  it("captures line and block comments", () => {
    expect(kinds("// c\n1")).toContain("LineComment");
    expect(kinds("/* c */ 1")).toContain("BlockComment");
  });

  it("preserves source offsets so tokens are contiguous", () => {
    const src = "let y=1";
    const toks = tokenize(src);
    // Reconstructing from (start, value) must reproduce the source exactly.
    const rebuilt = toks.map((t) => t.value).join("");
    expect(rebuilt).toBe(src);
    expect(toks[0].start).toBe(0);
  });

  it("returns an empty array for empty input", () => {
    expect(tokenize("")).toEqual([]);
  });
});
