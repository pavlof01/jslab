export type ChangeAdd = { type: "add"; line: string; nextLine: number };
export type ChangeDel = { type: "del"; line: string; prevLine: number };
export type ChangeText = { type: "keep"; line: string; prevLine: number; nextLine: number };

type Change = ChangeText | ChangeDel | ChangeAdd;

export type DiffResult = {
  added: { line: string; nextLine: number }[];
  deleted: { line: string; prevLine: number }[];
  changes: Change[]; // full trace if you need it
};

export type CompareOptions = {
  /** Normalize each line before diff (e.g., strip volatile addresses) */
  normalizeLine?: (line: string) => string;
  /** Trim trailing/leading whitespace before diff (default: false) */
  trim?: boolean;
  /** Treat multiple spaces as one when diffing (default: false) */
  collapseWhitespace?: boolean;
};

export function compareOutputs(prevOutput: string, nextOutput: string, opts: CompareOptions = {}): DiffResult {
  const norm = (s: string) => {
    let r = s;
    if (opts.trim) r = r.trim();
    if (opts.collapseWhitespace) r = r.replace(/\s+/g, " ");
    if (opts.normalizeLine) r = opts.normalizeLine(r);
    return r;
  };

  const prevLines = splitLines(prevOutput);
  const nextLines = splitLines(nextOutput);

  // For diffing we keep both the raw line and a normalized key
  const A = prevLines.map((line) => ({ raw: line, key: norm(line) }));
  const B = nextLines.map((line) => ({ raw: line, key: norm(line) }));

  // LCS dynamic programming table
  const n = A.length;
  const m = B.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i].key === B[j].key ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  // Backtrack to produce changes
  const changes: Change[] = [];
  let i = 0,
    j = 0;
  while (i < n && j < m) {
    if (A[i].key === B[j].key) {
      changes.push({
        type: "keep",
        line: A[i].raw,
        prevLine: i + 1,
        nextLine: j + 1,
      });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      changes.push({ type: "del", line: A[i].raw, prevLine: i + 1 });
      i++;
    } else {
      changes.push({ type: "add", line: B[j].raw, nextLine: j + 1 });
      j++;
    }
  }
  while (i < n) {
    changes.push({ type: "del", line: A[i].raw, prevLine: i + 1 });
    i++;
  }
  while (j < m) {
    changes.push({ type: "add", line: B[j].raw, nextLine: j + 1 });
    j++;
  }

  return {
    added: changes
      .filter((c): c is Extract<Change, { type: "add" }> => c.type === "add")
      .map(({ line, nextLine }) => ({ line, nextLine })),
    deleted: changes
      .filter((c): c is Extract<Change, { type: "del" }> => c.type === "del")
      .map(({ line, prevLine }) => ({ line, prevLine })),
    changes,
  };
}

function splitLines(s: string): string[] {
  // Handles \r\n, \n, and keeps empty lines stable
  return s.replace(/\r\n/g, "\n").split("\n");
}
