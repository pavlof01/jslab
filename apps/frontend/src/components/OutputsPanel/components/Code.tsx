import { Flex } from "@chakra-ui/react";
import type { TokensResult } from "shiki";

import type { OutputAnnotation } from "@/lib/annotations";
import type { EngineKey } from "@/lib/types";

import PlainCodeRow from "./CodeRow";
import { annotationsPerRow, lineKey, lineSpans } from "./codeRows";

type Props = TokensResult & { engineKey?: EngineKey; annotations?: OutputAnnotation[] };

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
