"use client";

import { useCallback, useMemo } from "react";
import { Button, Flex, Link, Text } from "@chakra-ui/react";
import { CiPlay1 } from "react-icons/ci";
import { LuExternalLink } from "react-icons/lu";

import { EditorPanel } from "@/components/EditorPanel";
import { OutputsPanel } from "@/components/OutputsPanel";
import { ENGINE_KEYS } from "@/lib/types";
import { useEngineOutputsActions, useEngineOutputsState } from "@/store/useEngineOutputs";
import { useSharedStateRestore } from "@/app/_components/useSharedStateRestore";
import { buildShareUrl } from "@/lib/shareState";

/**
 * Compact, chrome-free playground for embedding in an iframe (blog posts,
 * course material). Restores shared `?s=` state, runs, and links back to the
 * full app with the current snippet preserved.
 */
export default function EmbedPlaygroundClient() {
  const { status, code, engines, selectedV8Flags } = useEngineOutputsState();
  const { runEngines, setCode } = useEngineOutputsActions();
  useSharedStateRestore();

  const run = useCallback(async () => {
    try {
      await runEngines();
    } catch {}
  }, [runEngines]);

  // Origin-relative on purpose: this runs during render, including the build-time
  // prerender where `window` doesn't exist. The embed is served from the same
  // origin as the full app, so the browser resolves it to the same URL.
  const openInJslabHref = useMemo(() => {
    const state = { code, engines: ENGINE_KEYS.filter((k) => engines[k]), v8Flags: selectedV8Flags };
    return buildShareUrl("", "/playground", state);
  }, [code, engines, selectedV8Flags]);

  return (
    <Flex direction="column" height="100dvh" bg="background.100">
      <Flex
        h={11}
        px={3}
        align="center"
        justify="space-between"
        borderBottom="1px solid"
        borderColor="#262626"
        flexShrink={0}
      >
        <Text fontSize="xs" fontWeight="700" color="whiteAlpha.600" letterSpacing="0.04em">
          JSLab
        </Text>
        <Flex gap={2} align="center">
          <Button size="xs" onClick={run} loading={status === "running"} loadingText="Running">
            <CiPlay1 /> Run
          </Button>
          <Link
            href={openInJslabHref}
            target="_blank"
            rel="noopener noreferrer"
            fontSize="xs"
            color="brand.300"
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
