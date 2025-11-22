import { Change, ChangeAdd, ChangeDel, DiffKind, DiffResult } from "@/lib/types";
import type { ThemedToken, TokensResult } from "shiki";

export type CompareOptions = {
  normalizeLine?: (line: string) => string;
  trim?: boolean;
  collapseWhitespace?: boolean;
};

export function compareOutputs(
  prevTokens: TokensResult,
  nextTokens: TokensResult,
  opts: CompareOptions = {}
): TokensResult {
  const diff = buildDiff(tokensToLines(prevTokens.tokens), tokensToLines(nextTokens.tokens), opts);

  const diffLines = diff.changes.map((change) => {
    if (change.type === DiffKind.Keep) {
      return tagTokens(prevTokens.tokens[(change.nextLine ?? 1) - 1], DiffKind.Keep, change.prevLine, change.nextLine);
    }
    if (change.type === DiffKind.Add) {
      return tagTokens(nextTokens.tokens[(change.nextLine ?? 1) - 1], DiffKind.Add, undefined, change.nextLine);
    }
    return tagTokens(prevTokens.tokens[(change.prevLine ?? 1) - 1], DiffKind.Del, change.prevLine, undefined);
  });

  return {
    ...nextTokens,
    tokens: diffLines,
    diff,
  };
}

function tokensToLines(tokens: ThemedToken[][]): string[] {
  return tokens.map((line) => line.map((token) => token.content ?? "").join(""));
}

function tagTokens(tokens: ThemedToken[] | undefined, diffType: DiffKind, prevLine?: number, nextLine?: number) {
  return (tokens ?? []).map((token) => ({
    ...token,
    diffType,
    prevLine,
    nextLine,
  }));
}

function buildDiff(prevLines: string[], nextLines: string[], opts: CompareOptions): DiffResult {
  const norm = (s: string) => {
    let r = s;
    if (opts.trim) r = r.trim();
    if (opts.collapseWhitespace) r = r.replace(/\s+/g, " ");
    if (opts.normalizeLine) r = opts.normalizeLine(r);
    return r;
  };

  const A = prevLines.map((line) => ({ raw: line, key: norm(line) }));
  const B = nextLines.map((line) => ({ raw: line, key: norm(line) }));

  const n = A.length;
  const m = B.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i].key === B[j].key ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const changes: Change[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i].key === B[j].key) {
      changes.push({
        type: DiffKind.Keep,
        line: A[i].raw,
        prevLine: i + 1,
        nextLine: j + 1,
      });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      changes.push({ type: DiffKind.Del, line: A[i].raw, prevLine: i + 1 });
      i++;
    } else {
      changes.push({ type: DiffKind.Add, line: B[j].raw, nextLine: j + 1 });
      j++;
    }
  }
  while (i < n) {
    changes.push({ type: DiffKind.Del, line: A[i].raw, prevLine: i + 1 });
    i++;
  }
  while (j < m) {
    changes.push({ type: DiffKind.Add, line: B[j].raw, nextLine: j + 1 });
    j++;
  }

  return {
    added: changes
      .filter((c): c is ChangeAdd => c.type === DiffKind.Add)
      .map(({ line, nextLine }) => ({ line, nextLine })),
    deleted: changes
      .filter((c): c is ChangeDel => c.type === DiffKind.Del)
      .map(({ line, prevLine }) => ({ line, prevLine })),
    changes,
  };
}
