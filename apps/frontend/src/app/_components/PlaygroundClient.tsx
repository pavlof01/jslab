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

const DEFAULT_SPLIT = [35, 65];
const DEFAULT_SPLIT_MOBILE = [20, 80];

const createEngineSelection = (): Record<EngineKey, boolean> => ({
  [EngineKey.v8]: true,
  [EngineKey.sm]: false,
  [EngineKey.hermes]: false,
  [EngineKey.jsc]: false,
});

export default function PlaygroundClient() {
  const { status, showDiff, code, engines, activeTab, selectedV8Flags } = useEngineOutputsState();
  const { runEngines, updateCurrentRunActiveTab, toggleDiff, setCode, setEngines, setActiveTab } =
    useEngineOutputsActions();
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

  useEffect(() => {
    updateCurrentRunActiveTab(activeTab);
  }, [activeTab, updateCurrentRunActiveTab]);

  const run = useCallback(async () => {
    try {
      await runEngines({
        code,
        engines: selectedEngines,
        v8Flags: selectedV8Flags,
        activeTab,
      });
    } catch {}
  }, [runEngines, code, selectedEngines, selectedV8Flags, activeTab]);

  return (
    <Flex direction="column" bg="brand.800" height="100dvh">
      <Flex
        height={65}
        bg="#1e1e1e"
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
          <Button size="sm" variant="surface" colorPalette="white" onClick={toggleDiff}>
            {showDiff ? "Hide Diff" : "Show Diff"}
          </Button>
          <EngineCheckboxSelector selectedEngines={selectedEngines} onEnginesChange={handleEnginesChange} tabs={tabs} />
        </HStack>
      </Flex>
      <Splitter.Root
        orientation={isMobile ? "vertical" : "horizontal"}
        panels={[{ id: "editor", collapsible: true, collapsedSize: 5, minSize: 25 }, { id: "outputs" }]}
        defaultSize={isMobile ? sizesMobile : sizes}
        onResizeEnd={(e) => (isMobile ? setSizesMobile(e.size) : setSizes(e.size))}
        height="100%"
      >
        <Splitter.Panel id="editor">
          <Flex bg="#1e1e1e" flexDirection="column" height="100%">
            <Flex flex={1} overflow="scroll">
              <EditorPanel code={code} onCodeChange={(value) => setCode(value ?? "")} />
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
          <Flex bg="#1e1e1e" flexDirection="column" height="100%">
            <Flex flex={1} overflow="scroll">
              <OutputsPanel />
            </Flex>
          </Flex>
        </Splitter.Panel>
      </Splitter.Root>
    </Flex>
  );
}
