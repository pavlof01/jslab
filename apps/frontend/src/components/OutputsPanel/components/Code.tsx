import { Flex } from "@chakra-ui/react";
import type { ThemedToken, TokensResult } from "shiki";

import type { OutputAnnotation } from "@/lib/annotations";
import { DiffKind, type EngineKey } from "@/lib/types";
import { rowWidth } from "@/utils/diff-bytecode";

import PlainCodeRow from "./CodeRow";

type Props = TokensResult & { engineKey: EngineKey; annotations?: OutputAnnotation[] };

export function lineKey(row: ThemedToken[], startOffset: number): string {
  const [first] = row;
  if (first?.diffType) return `${first.diffType}:${first.prevLine ?? ""}:${first.nextLine ?? ""}`;

  return `at-${startOffset}`;
}

export type LineSpan = { start: number; end: number };

export function lineSpans(lines: ThemedToken[][]): LineSpan[] {
  return lines.map((row) => {
    const start = row[0]?.offset ?? 0;
    return { start, end: start + rowWidth(row) };
  });
}

const annotationsPerRow = (
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

const CodeDisplay: React.FC<Props> = ({ tokens, fg, bg, engineKey, annotations }) => {
  const spans = lineSpans(tokens);
  const rowAnnotations = annotationsPerRow(tokens, spans, annotations);

  return (
    <Flex as="code" py={6} flexDirection="column" borderRadius="md" bg={bg} color={fg}>
      {tokens.map((row, index) => (
        <PlainCodeRow
          key={lineKey(row, spans[index].start)}
          tokens={row}
          lineNumber={index}
          span={spans[index]}
          engineKey={engineKey}
          annotations={rowAnnotations[index]}
        />
      ))}
    </Flex>
  );
};

export default CodeDisplay;
