"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Button, Flex, HStack, Splitter, useBreakpointValue } from "@chakra-ui/react";
import { CiPlay1 } from "react-icons/ci";

import { EditorPanel } from "@/components/EditorPanel";
import EngineCheckboxSelector from "@/components/EngineCheckboxSelector";
import { OutputsPanel, tabs } from "@/components/OutputsPanel";
import Samples from "@/components/Samples";
import { ENGINE_KEYS, EngineKey, isEngineKey } from "@/lib/types";
import { useEngineOutputsActions, useEngineOutputsState } from "@/store/useEngineOutputs";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import ShareButton from "@/app/_components/ShareButton";
import RunHistory from "@/app/_components/RunHistory";
import RunStatusBar from "@/app/_components/RunStatusBar";
import { useSharedStateRestore } from "@/app/_components/useSharedStateRestore";
import { pushHistory } from "@/lib/runHistory";

const DEFAULT_SPLIT = [35, 65];
const DEFAULT_SPLIT_MOBILE = [20, 80];

const createEngineSelection = (): Record<EngineKey, boolean> => ({
  [EngineKey.v8]: true,
  [EngineKey.sm]: false,
  [EngineKey.hermes]: false,
  [EngineKey.jsc]: false,
});

export default function PlaygroundClient() {
  const { status, showDiff, code, engines, selectedV8Flags } = useEngineOutputsState();
  const { runEngines, toggleDiff, setCode, setEngines } = useEngineOutputsActions();
  useSharedStateRestore();
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;
  const [sizes, setSizes] = useLocalStorage("splitter-sizes", DEFAULT_SPLIT);
  const [sizesMobile, setSizesMobile] = useLocalStorage("splitter-sizes-mobile", DEFAULT_SPLIT_MOBILE);

  const selectedEngines = useMemo(() => ENGINE_KEYS.filter((key) => engines[key]), [engines]);

  const handleEnginesChange = useCallback(
    (values: EngineKey[]) => {
      const normalized = new Set<EngineKey>([EngineKey.v8]);
      values.forEach((value) => {
        if (isEngineKey(value)) {
          normalized.add(value);
        }
      });
      const next = createEngineSelection();
      ENGINE_KEYS.forEach((engine) => {
        next[engine] = normalized.has(engine);
      });
      setEngines(next);
    },
    [setEngines],
  );

  const run = useCallback(async () => {
    try {
      await runEngines();
      // Record the run so the history drawer can restore it later.
      pushHistory(
        { code, engines: ENGINE_KEYS.filter((k) => engines[k]), v8Flags: selectedV8Flags },
        () => crypto.randomUUID(),
        Date.now(),
      );
    } catch {}
  }, [runEngines, code, engines, selectedV8Flags]);

  return (
    <Flex direction="column" bg="brand.800" height="calc(100dvh - var(--header-h))">
      <Flex
        height={65}
        bg="background.100"
        borderBottom="1px solid"
        justifyContent="space-between"
        alignItems="center"
        borderColor="#262626"
        px={4}
      >
        <HStack>
          <Samples currentCode={code} onSelectSample={setCode} />
        </HStack>
        <Button size="md" w={120} onClick={run} loading={status === "running"} loadingText="Running">
          <CiPlay1 /> Run
        </Button>
        <HStack>
          <RunHistory />
          <ShareButton />
          <Button size="sm" variant="surface" colorPalette="white" onClick={toggleDiff}>
            {showDiff ? "Hide Diff" : "Show Diff"}
          </Button>
          <EngineCheckboxSelector selectedEngines={selectedEngines} onEnginesChange={handleEnginesChange} tabs={tabs} />
        </HStack>
      </Flex>
      <RunStatusBar />
      <Splitter.Root
        orientation={isMobile ? "vertical" : "horizontal"}
        panels={[{ id: "editor", collapsible: true, collapsedSize: 5, minSize: 25 }, { id: "outputs" }]}
        defaultSize={isMobile ? sizesMobile : sizes}
        onResizeEnd={(e) => (isMobile ? setSizesMobile(e.size) : setSizes(e.size))}
        height="100%"
      >
        <Splitter.Panel id="editor">
          <Flex bg="background.100" flexDirection="column" height="100%">
            <Flex flex={1} overflow="scroll">
              <EditorPanel code={code} onCodeChange={(value) => setCode(value ?? "")} onRun={run} />
            </Flex>
          </Flex>
        </Splitter.Panel>

        <Splitter.Context>
          {(context) => (
            <Splitter.ResizeTrigger
              id="editor:outputs"
              onDoubleClick={() => {
                context.resetSizes();
              }}
            />
          )}
        </Splitter.Context>

        <Splitter.Panel id="outputs">
          <Flex bg="background.100" flexDirection="column" height="100%">
            <Flex flex={1} overflow="scroll">
              <OutputsPanel />
            </Flex>
          </Flex>
        </Splitter.Panel>
      </Splitter.Root>
    </Flex>
  );
}
