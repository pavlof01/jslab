import { describe, it, expect } from "@jest/globals";
import { compareOutputs } from "./diff-bytecode";
import { DiffKind } from "@/lib/types";
import type { TokensResult, ThemedToken } from "shiki";

// Build a TokensResult where each source line becomes a single token whose
// content is that line — enough to exercise compareOutputs' line diffing.
function grid(lines: string[]): TokensResult {
  const tokens: ThemedToken[][] = lines.map((line) => [
    { content: line, offset: 0, color: "#fff" } as ThemedToken,
  ]);
  return { tokens, fg: "", bg: "", themeName: "t", rootStyle: "" } as unknown as TokensResult;
}

const identity = { normalizeLine: (l: string) => l };
const diffTypeOf = (token: ThemedToken) => (token as ThemedToken & { diffType: DiffKind }).diffType;

describe("compareOutputs", () => {
  it("marks every line Keep when both sides are identical", () => {
    const res = compareOutputs(grid(["a", "b"]), grid(["a", "b"]), identity);
    expect(res.tokens.map((line) => diffTypeOf(line[0]))).toEqual([DiffKind.Keep, DiffKind.Keep]);
  });

  it("marks a purely added line Add", () => {
    const res = compareOutputs(grid(["a"]), grid(["a", "b"]), identity);
    const types = res.tokens.map((line) => diffTypeOf(line[0]));
    expect(types).toContain(DiffKind.Add);
    expect(types).not.toContain(DiffKind.Del);
  });

  it("marks a purely removed line Del", () => {
    const res = compareOutputs(grid(["a", "b"]), grid(["a"]), identity);
    const types = res.tokens.map((line) => diffTypeOf(line[0]));
    expect(types).toContain(DiffKind.Del);
    expect(types).not.toContain(DiffKind.Add);
  });

  it("uses normalizeLine so noise-only differences read as unchanged", () => {
    const stripHex = { normalizeLine: (l: string) => l.replace(/0x[0-9a-f]+/g, "0x") };
    const res = compareOutputs(grid(["mov 0xdead"]), grid(["mov 0xbeef"]), stripHex);
    expect(diffTypeOf(res.tokens[0][0])).toBe(DiffKind.Keep);
  });
});
