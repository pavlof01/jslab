import { TokensResult } from "shiki";

import PlainCodeRow from "./CodeRow";
import { Flex } from "@chakra-ui/react";
import type { EngineKey } from "@/lib/types";

type Props = TokensResult & { engineKey: EngineKey };

const CodeDisplay: React.FC<Props> = ({ tokens, fg, bg, engineKey }) => {
  return (
    <Flex as="code" py={6} flexDirection="column" borderRadius="md" bg={bg} color={fg}>
      {tokens.map((row, idx) => (
        <PlainCodeRow key={`line-${idx}`} tokens={row} lineNumber={idx} engineKey={engineKey} />
      ))}
    </Flex>
  );
};

export default CodeDisplay;
