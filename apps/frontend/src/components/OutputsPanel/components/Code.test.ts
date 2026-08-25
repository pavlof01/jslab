import { describe, expect, it } from "@jest/globals";
import type { ThemedToken, TokensResult } from "shiki";

import { DiffKind } from "@/lib/types";
import { compareOutputs } from "@/utils/diff-bytecode";

import { lineKey, lineStarts } from "./Code";

const token = (content: string, offset: number) => ({ content, offset, color: "" }) as ThemedToken;
const listing = (lines: string[]): TokensResult =>
  ({ tokens: lines.map((line, index) => (line ? [token(line, index * 10)] : [])) }) as TokensResult;

const keysOf = (rows: ThemedToken[][]) => {
  const starts = lineStarts(rows);
  return rows.map((row, index) => lineKey(row, starts[index]));
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
    const rows = [[token("alpha", 0)], [], [], [token("beta", 8)]];

    expect(new Set(keysOf(rows)).size).toBe(4);
  });
});
