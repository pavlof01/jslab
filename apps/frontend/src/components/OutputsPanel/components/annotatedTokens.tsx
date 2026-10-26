import { Button } from "@chakra-ui/react";
import type { ReactNode } from "react";
import type { ThemedToken } from "shiki";

import { ClickPopover } from "@/components/ui";
import type { OutputAnnotation } from "@/lib/annotations";
import type { EngineKey } from "@/lib/types";

import type { LineSpan } from "./codeRows";
import TokenSpan from "./CodeToken";
import TokenText from "./TokenText";

type TokenRow = { tokens: ThemedToken[]; span: LineSpan; engineKey?: EngineKey };

export const renderAnnotatedTokens = (
  { tokens, span, engineKey }: TokenRow,
  annotations: OutputAnnotation[],
): ReactNode[] => {
  const { start: lineStart, end: lineEnd } = span;
  let offset = lineStart;
  const positions = tokens.map((token, index) => {
    const start = offset;
    offset += token.content.length;
    return { token, start, end: offset, index };
  });

  const sliceRange = (from: number, to: number, annotated = false): ReactNode[] =>
    positions
      .filter((position) => position.start < to && position.end > from)
      .map(({ token, start, end, index }) => {
        const key = `${index}-${Math.max(from, start)}`;
        const whole = from <= start && to >= end;
        const slice = whole
          ? token
          : {
              ...token,
              content: token.content.slice(
                Math.max(from, start) - start,
                Math.min(to, end) - start,
              ),
            };
        if (annotated) return <TokenText key={key} token={slice} />;
        return (
          <TokenSpan
            key={key}
            token={token}
            slice={whole ? undefined : slice}
            nextToken={tokens[index + 1]}
            engineKey={engineKey}
          />
        );
      });

  const textOf = (from: number, to: number): string =>
    positions
      .filter((position) => position.start < to && position.end > from)
      .map(({ token, start }) =>
        token.content.slice(
          Math.max(from, start) - start,
          Math.min(to, start + token.content.length) - start,
        ),
      )
      .join("");

  const content: ReactNode[] = [];
  let cursor = lineStart;
  for (const annotation of annotations) {
    const start = Math.max(lineStart, annotation.start);
    const end = Math.min(lineEnd, annotation.end);
    content.push(...sliceRange(cursor, start));
    content.push(
      <ClickPopover key={annotation.id} title={annotation.title} content={annotation.text}>
        <Button
          variant="annotation"
          typeface="code"
          type="button"
          aria-label={textOf(start, end)}
          data-output-annotation={annotation.id}
        >
          {sliceRange(start, end, true)}
        </Button>
      </ClickPopover>,
    );
    cursor = end;
  }
  content.push(...sliceRange(cursor, lineEnd));
  return content;
};
