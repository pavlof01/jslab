import { diffArrays } from "diff";
import type { ThemedToken, TokensResult } from "shiki";

import { DiffKind } from "@/lib/types";

type DiffTokensResult = Omit<TokensResult, "tokens"> & {
  tokens: ThemedToken[][];
};

const lineToString = (tokens: ThemedToken[]): string => tokens.map((t) => t.content).join("");

export const rowWidth = (row: ThemedToken[]): number =>
  row.reduce((width, token) => width + token.content.length, 0);

export const lineStartOffsets = (text: string): number[] => {
  const starts = [0];
  for (const newline of text.matchAll(/\r\n|\r|\n/g)) {
    starts.push(newline.index + newline[0].length);
  }
  return starts;
};

export const fillBlankRows = (result: TokensResult, text: string): TokensResult => {
  if (!result.tokens.some((row) => row.length === 0)) return result;
  const starts = lineStartOffsets(text);
  const tokens = result.tokens.map((row, index) =>
    row.length
      ? row
      : [{ content: "", offset: starts[index] ?? 0, color: result.fg } as ThemedToken],
  );
  return { ...result, tokens };
};

export const compareOutputs = (
  prev: TokensResult,
  current: TokensResult,
  options: { normalizeLine: (line: string) => string },
): DiffTokensResult => {
  const prevLines = prev.tokens.map((line) => options.normalizeLine(lineToString(line)));
  const currentLines = current.tokens.map((line) => options.normalizeLine(lineToString(line)));

  const changes = diffArrays(prevLines, currentLines);

  const resultTokens: ThemedToken[][] = [];
  let prevLineNum = 1;
  let currentLineNum = 1;

  for (const change of changes) {
    const lines = change.value;
    if (change.added) {
      for (let i = 0; i < lines.length; i++) {
        const lineIndex = currentLineNum - 1 + i;
        const lineTokens = current.tokens[lineIndex].map((token) => ({
          ...token,
          diffType: DiffKind.Add,
          nextLine: currentLineNum + i,
        }));
        resultTokens.push(lineTokens);
      }
      currentLineNum += lines.length;
    } else if (change.removed) {
      for (let i = 0; i < lines.length; i++) {
        const lineIndex = prevLineNum - 1 + i;
        const lineTokens = prev.tokens[lineIndex].map((token) => ({
          ...token,
          diffType: DiffKind.Del,
          prevLine: prevLineNum + i,
        }));
        resultTokens.push(lineTokens);
      }
      prevLineNum += lines.length;
    } else {
      for (let i = 0; i < lines.length; i++) {
        const lineIndex = currentLineNum - 1 + i;
        const lineTokens = current.tokens[lineIndex].map((token) => ({
          ...token,
          diffType: DiffKind.Keep,
          prevLine: prevLineNum + i,
          nextLine: currentLineNum + i,
        }));
        resultTokens.push(lineTokens);
      }
      prevLineNum += lines.length;
      currentLineNum += lines.length;
    }
  }

  return {
    ...current,
    tokens: resultTokens,
  };
};
