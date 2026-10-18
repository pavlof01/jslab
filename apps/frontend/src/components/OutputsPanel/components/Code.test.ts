import { describe, expect, it } from "@jest/globals";
import type { ThemedToken, TokensResult } from "shiki";

import { DiffKind } from "@/lib/types";
import { compareOutputs, fillBlankRows } from "@/utils/diff-bytecode";

import { lineKey, lineSpans } from "./Code";

const token = (content: string, offset: number) => ({ content, offset, color: "" }) as ThemedToken;
const listing = (lines: string[]): TokensResult =>
  ({ tokens: lines.map((line, index) => (line ? [token(line, index * 10)] : [])) }) as TokensResult;

const keysOf = (rows: ThemedToken[][]) => {
  const spans = lineSpans(rows);
  return rows.map((row, index) => lineKey(row, spans[index].start));
};

describe("lineKey", () => {
  it("keeps diff rows apart, where offsets collide", () => {
    const diff = compareOutputs(listing(["a", "b", "c"]), listing(["a", "x", "c"]), {
      normalizeLine: (line) => line,
    });

    const keys = keysOf(diff.tokens);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.some((key) => key.startsWith(`${DiffKind.Del}:`))).toBe(true);
    expect(keys.some((key) => key.startsWith(`${DiffKind.Add}:`))).toBe(true);
  });

  it("identifies a plain line by where it starts", () => {
    expect(keysOf(listing(["alpha", "beta"]).tokens)).toEqual(["at-0", "at-10"]);
  });

  it("gives consecutive blank lines their own places", () => {
    const rows = fillBlankRows(
      { tokens: [[token("alpha", 0)], [], [], [token("beta", 8)]] } as unknown as TokensResult,
      "alpha\n\n\nbeta",
    ).tokens;

    expect(new Set(keysOf(rows)).size).toBe(4);
  });
});

describe("fillBlankRows", () => {
  it("gives blank rows a token so diff metadata and keys can attach", () => {
    const filled = fillBlankRows(
      { tokens: [[token("a", 0)], [], [token("b", 3)]], fg: "#fff" } as unknown as TokensResult,
      "a\n\nb",
    );

    expect(filled.tokens[1]).toEqual([{ content: "", offset: 2, color: "#fff" }]);

    const diff = compareOutputs(
      fillBlankRows(listing(["a", "b"]), "a\nb"),
      fillBlankRows(listing(["a", "", "b"]), "a\n\nb"),
      { normalizeLine: (line) => line },
    );
    expect(diff.tokens[1][0]).toMatchObject({ diffType: DiffKind.Add, nextLine: 2 });
    expect(new Set(keysOf(diff.tokens)).size).toBe(diff.tokens.length);
  });

  it("places blank rows after a CRLF line break where they really start", () => {
    const filled = fillBlankRows(
      { tokens: [[token("a", 0)], [], [token("b", 5)]], fg: "" } as unknown as TokensResult,
      "a\r\n\r\nb",
    );

    expect(filled.tokens[1][0].offset).toBe(3);
    expect(lineSpans(filled.tokens)).toEqual([
      { start: 0, end: 1 },
      { start: 3, end: 3 },
      { start: 5, end: 6 },
    ]);
  });
});
