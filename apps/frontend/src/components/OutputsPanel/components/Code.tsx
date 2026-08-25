import { Flex } from "@chakra-ui/react";
import { ThemedToken, TokensResult } from "shiki";

import type { EngineKey } from "@/lib/types";

import PlainCodeRow from "./CodeRow";

type Props = TokensResult & { engineKey: EngineKey };

export function lineKey(row: ThemedToken[], startOffset: number): string {
  const [first] = row;
  if (first?.diffType) return `${first.diffType}:${first.prevLine ?? ""}:${first.nextLine ?? ""}`;

  return `at-${startOffset}`;
}

export function lineStarts(lines: ThemedToken[][]): number[] {
  const starts: number[] = [];
  let offset = 0;

  for (const row of lines) {
    const start = row[0]?.offset ?? offset;
    starts.push(start);
    offset = start + row.reduce((width, token) => width + token.content.length, 0) + 1;
  }

  return starts;
}

const CodeDisplay: React.FC<Props> = ({ tokens, fg, bg, engineKey }) => {
  const starts = lineStarts(tokens);

  return (
    <Flex as="code" py={6} flexDirection="column" borderRadius="md" bg={bg} color={fg}>
      {tokens.map((row, index) => (
        <PlainCodeRow
          key={lineKey(row, starts[index])}
          tokens={row}
          lineNumber={index}
          engineKey={engineKey}
        />
      ))}
    </Flex>
  );
};

export default CodeDisplay;
