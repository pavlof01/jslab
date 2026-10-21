import { Box } from "@chakra-ui/react";

import type { CodeLine } from "@/lib/articles/blocks";

type Props = { text: string; lines: CodeLine[] | null };

const MarkdownCode: React.FC<Props> = ({ text, lines }) => (
  <Box
    as="pre"
    layerStyle="panel"
    textStyle="code"
    color="ink.code"
    px={4}
    py={3}
    overflowX="auto"
    whiteSpace="pre"
  >
    <code>
      {lines
        ? lines.map((line) => (
            <Box as="span" key={line.key} display="block" minH="1lh">
              {line.tokens.map((token) => (
                <span key={token.key} style={{ color: token.color }}>
                  {token.content}
                </span>
              ))}
            </Box>
          ))
        : text}
    </code>
  </Box>
);

export default MarkdownCode;
