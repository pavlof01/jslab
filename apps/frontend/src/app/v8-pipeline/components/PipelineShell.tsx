import { Flex, Text } from "@chakra-ui/react";

import PipelineEditor from "./PipelineEditor";
import PipelineError from "./PipelineError";
import PipelineProvider from "./PipelineProvider";
import PipelineRunButton from "./PipelineRunButton";
import PipelineSplit from "./PipelineSplit";
import PipelineStages from "./PipelineStages";

const PipelineShell: React.FC = () => {
  return (
    <PipelineProvider>
      <Flex as="main" direction="column" height="calc(100dvh - {sizes.header})">
        <Flex
          h={14}
          bg="surface.band"
          borderBottom="1px solid"
          borderColor="rule.structural"
          px={4}
          align="center"
          justify="space-between"
          flexShrink={0}
        >
          <Text fontSize="sm" fontWeight="700" color="ink.label" letterSpacing="0.04em">
            V8 Compilation Pipeline
          </Text>
          <PipelineRunButton />
        </Flex>

        <PipelineError />

        <PipelineSplit editor={<PipelineEditor />} stages={<PipelineStages />} />
      </Flex>
    </PipelineProvider>
  );
};

export default PipelineShell;
