import { TokensResult } from "shiki";

import PlainCodeRow from "./CodeRow";
import { Flex } from "@chakra-ui/react";

const CodeDisplay: React.FC<TokensResult> = ({ tokens, fg, bg }) => {
  return (
    <Flex as="code" py={6} flexDirection="column" borderRadius="md" bg={bg} color={fg}>
      {tokens.map((row, idx) => (
        <PlainCodeRow key={`line-${idx}`} tokens={row} lineNumber={idx} />
      ))}
    </Flex>
  );
};

export default CodeDisplay;
