import { Box } from "@chakra-ui/react";
import type { ThemedToken } from "shiki";

import type { OutputAnnotation } from "@/lib/annotations";
import { DiffKind, type EngineKey } from "@/lib/types";

import { renderAnnotatedTokens } from "./annotatedTokens";
import type { LineSpan } from "./codeRows";
import TokenSpan from "./CodeToken";
import LineNumber from "./LineNumber";

type Props = {
  tokens: ThemedToken[];
  lineNumber: number;
  span: LineSpan;
  engineKey?: EngineKey;
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
