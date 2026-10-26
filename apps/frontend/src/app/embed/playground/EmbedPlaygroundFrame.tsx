import { Flex, type FlexProps } from "@chakra-ui/react";

import OutputsPanel from "@/components/OutputsPanel";

import EmbedEditor from "./EmbedEditor";
import EmbedRunButton from "./EmbedRunButton";
import OpenInJslabLink from "./OpenInJslabLink";

type Props = FlexProps & { heading: React.ReactNode };

/** The runnable editor widget: a title bar with Run and "Open in JSLab", then editor beside output. */
const EmbedPlaygroundFrame: React.FC<Props> = ({ heading, ...rest }) => (
  <Flex direction="column" bg="surface.band" {...rest}>
    <Flex
      h={11}
      px={3}
      align="center"
      justify="space-between"
      borderBottom="1px solid"
      borderColor="rule.structural"
      flexShrink={0}
    >
      {heading}
      <Flex gap={2} align="center">
        <EmbedRunButton />
        <OpenInJslabLink />
      </Flex>
    </Flex>
    <Flex flex="1" minH={0} direction={{ base: "column", md: "row" }}>
      <Flex flex="1" minH={0} borderRight={{ md: "1px solid" }} borderColor="rule.structural">
        <EmbedEditor />
      </Flex>
      <Flex flex="1" minH={0} overflow="auto">
        <OutputsPanel />
      </Flex>
    </Flex>
  </Flex>
);

export default EmbedPlaygroundFrame;
