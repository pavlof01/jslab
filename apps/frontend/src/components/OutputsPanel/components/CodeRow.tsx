import { Box, Button } from "@chakra-ui/react";
import type { ReactNode } from "react";
import type { ThemedToken } from "shiki";

import { ClickPopover } from "@/components/ui";
import type { OutputAnnotation } from "@/lib/annotations";
import { DiffKind, type EngineKey } from "@/lib/types";

import type { LineSpan } from "./Code";
import TokenSpan from "./CodeToken";
import LineNumber from "./LineNumber";
import TokenText from "./TokenText";

type Props = {
  tokens: ThemedToken[];
  lineNumber: number;
  span: LineSpan;
  engineKey: EngineKey;
  annotations?: OutputAnnotation[];
};

const diffKindToClass: Record<DiffKind, string> = {
  [DiffKind.Add]: "diff-add",
  [DiffKind.Del]: "diff-del",
  [DiffKind.Keep]: "diff-keep",
};

const diffKindToPrefix: Record<DiffKind, string> = {
  [DiffKind.Add]: "+",
  [DiffKind.Del]: "-",
  [DiffKind.Keep]: " ",
};

const renderAnnotatedTokens = (
  { tokens, span, engineKey }: Omit<Props, "lineNumber" | "annotations">,
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

const PlainCodeRow: React.FC<Props> = ({ tokens, lineNumber, span, engineKey, annotations }) => {
  const first = tokens[0];
  const diffKind = first?.diffType;
  const content = annotations?.length
    ? renderAnnotatedTokens({ tokens, span, engineKey }, annotations)
    : tokens.map((token, index) => (
        <TokenSpan
          key={token.offset}
          token={token}
          nextToken={tokens[index + 1]}
          engineKey={engineKey}
        />
      ));

  return (
    <Box
      as="span"
      className={diffKind ? diffKindToClass[diffKind] : ""}
      whiteSpace="pre"
      display="inline-block"
      minH="1.65em"
    >
      <Box as="span" display="inline-block" w="1.5ch" textAlign="center" userSelect="none">
        {diffKind ? diffKindToPrefix[diffKind] : " "}
      </Box>
      <LineNumber value={first?.prevLine ?? lineNumber} />
      <LineNumber value={first?.nextLine ?? ""} />
      {content}
    </Box>
  );
};

export default PlainCodeRow;
