"use client";

import { Flex, Text } from "@chakra-ui/react";
import { useLayoutEffect } from "react";

import EmbedEditor from "@/app/embed/playground/EmbedEditor";
import EmbedRunButton from "@/app/embed/playground/EmbedRunButton";
import OpenInJslabLink from "@/app/embed/playground/OpenInJslabLink";
import OutputsPanel from "@/components/OutputsPanel";
import type { ShareState } from "@/lib/shareState";
import { selectionFrom } from "@/lib/types";
import { supersedePendingRuns, useEngineOutputsStore } from "@/store/useEngineOutputs";

type Props = { state: ShareState };

const ArticleEditor: React.FC<Props> = ({ state }) => {
  useLayoutEffect(() => {
    const saved = useEngineOutputsStore.getState();
    const { reset, setCode, setEngines, setFlags } = saved;
    reset();
    setCode(state.code);
    setEngines(selectionFrom(state.engines));
    setFlags(state.flags);
    return () => {
      supersedePendingRuns();
      useEngineOutputsStore.setState(saved, true);
    };
  }, [state]);

  return (
    <Flex as="section" direction="column" layerStyle="panel" bg="surface.band" aria-label="Editor">
      <Flex
        h={11}
        px={3}
        align="center"
        justify="space-between"
        borderBottom="1px solid"
        borderColor="rule.structural"
        flexShrink={0}
      >
        <Text textStyle="label" color="ink.label">
          Try it
        </Text>
        <Flex gap={2} align="center">
          <EmbedRunButton />
          <OpenInJslabLink />
        </Flex>
      </Flex>
      <Flex direction={{ base: "column", md: "row" }} h={{ base: "640px", md: "420px" }} minH={0}>
        <Flex flex="1" minH={0} borderRight={{ md: "1px solid" }} borderColor="rule.structural">
          <EmbedEditor />
        </Flex>
        <Flex flex="1" minH={0} overflow="auto">
          <OutputsPanel />
        </Flex>
      </Flex>
    </Flex>
  );
};

export default ArticleEditor;
