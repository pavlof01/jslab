"use client";

import { useCallback, useMemo } from "react";
import { Button, Flex, Link, Text } from "@chakra-ui/react";
import { CiPlay1 } from "react-icons/ci";
import { LuExternalLink } from "react-icons/lu";

import { EditorPanel } from "@/components/EditorPanel";
import { OutputsPanel } from "@/components/OutputsPanel";
import { enabledEngines, RunStatus } from "@/lib/types";
import {
  useCode,
  useEngineSelection,
  useRunEngines,
  useRunStatus,
  useSetCode,
  useV8Flags,
} from "@/store/engineOutputsSelectors";
import { useSharedStateRestore } from "@/app/_components/useSharedStateRestore";
import { buildShareUrl } from "@/lib/shareState";

export default function EmbedPlaygroundClient() {
  const { status } = useRunStatus();
  const code = useCode();
  const setCode = useSetCode();
  const { engines } = useEngineSelection();
  const { selectedV8Flags } = useV8Flags();
  const runEngines = useRunEngines();
  useSharedStateRestore();

  const run = useCallback(() => {
    void runEngines();
  }, [runEngines]);

  const openInJslabHref = useMemo(() => {
    const state = { code, engines: enabledEngines(engines), v8Flags: selectedV8Flags };
    return buildShareUrl("", "/playground", state);
  }, [code, engines, selectedV8Flags]);

  return (
    <Flex direction="column" height="100dvh" bg="surface.band">
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
          <Button size="xs" onClick={run} loading={status === RunStatus.running} loadingText="Running">
            <CiPlay1 /> Run
          </Button>
          <Link
            href={openInJslabHref}
            target="_blank"
            rel="noopener noreferrer"
            fontSize="xs"
            color="accent"
            display="inline-flex"
            alignItems="center"
            gap={1}
          >
            Open in JSLab <LuExternalLink />
          </Link>
        </Flex>
      </Flex>

      <Flex flex="1" minH={0} direction={{ base: "column", md: "row" }}>
        <Flex flex="1" minH={0} borderRight={{ md: "1px solid #262626" }}>
          <EditorPanel code={code} onCodeChange={(v) => setCode(v ?? "")} onRun={run} />
        </Flex>
        <Flex flex="1" minH={0} overflow="auto">
          <OutputsPanel compact />
        </Flex>
      </Flex>
    </Flex>
  );
}
