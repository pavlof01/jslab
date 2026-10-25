import { Flex, Text } from "@chakra-ui/react";

import SharedStateRestore from "@/app/_components/SharedStateRestore";
import OutputsPanel from "@/components/OutputsPanel";

import EmbedEditor from "./EmbedEditor";
import EmbedRunButton from "./EmbedRunButton";
import OpenInJslabLink from "./OpenInJslabLink";

const EmbedPlaygroundShell: React.FC = () => {
  return (
    <Flex direction="column" height="100dvh" bg="surface.band">
      <SharedStateRestore />
      <Flex
        h={11}
        px={3}
        align="center"
        justify="space-between"
        borderBottom="1px solid"
        borderColor="rule.structural"
        flexShrink={0}
      >
        <Text fontSize="xs" fontWeight="700" color="ink.2" letterSpacing="0.04em">
          JSLab
        </Text>
        <Flex gap={2} align="center">
          <EmbedRunButton />
          <OpenInJslabLink />
        </Flex>
      </Flex>

      <Flex flex="1" minH={0} direction={{ base: "column", md: "row" }}>
        <Flex flex="1" minH={0} borderRight={{ md: "1px solid #262626" }}>
          <EmbedEditor />
        </Flex>
        <Flex flex="1" minH={0} overflow="auto">
          <OutputsPanel />
        </Flex>
      </Flex>
    </Flex>
  );
};

export default EmbedPlaygroundShell;
