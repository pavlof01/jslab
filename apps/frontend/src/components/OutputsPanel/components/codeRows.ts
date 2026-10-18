import type { ThemedToken } from "shiki";

import type { OutputAnnotation } from "@/lib/annotations";
import { DiffKind } from "@/lib/types";
import { rowWidth } from "@/utils/diff-bytecode";

export type LineSpan = { start: number; end: number };

export function lineKey(row: ThemedToken[], startOffset: number): string {
  const [first] = row;
  if (first?.diffType) return `${first.diffType}:${first.prevLine ?? ""}:${first.nextLine ?? ""}`;

  return `at-${startOffset}`;
}

export function lineSpans(lines: ThemedToken[][]): LineSpan[] {
  return lines.map((row) => {
    const start = row[0]?.offset ?? 0;
    return { start, end: start + rowWidth(row) };
  });
}

export const annotationsPerRow = (
  rows: ThemedToken[][],
  spans: LineSpan[],
  annotations?: OutputAnnotation[],
): (OutputAnnotation[] | undefined)[] => {
  let next = 0;
  return spans.map(({ start, end }, index) => {
    if (!annotations?.length || rows[index][0]?.diffType === DiffKind.Del) return undefined;
    while (next < annotations.length && annotations[next].end <= start) next++;
    let after = next;
    while (after < annotations.length && annotations[after].start < end) after++;
    const slice = after > next ? annotations.slice(next, after) : undefined;
    next = after;
    return slice;
  });
};
