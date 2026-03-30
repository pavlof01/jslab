"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Flex, HStack, Splitter } from "@chakra-ui/react";
import { CiPlay1 } from "react-icons/ci";

import { EditorPanel } from "@/components/EditorPanel";
import EngineCheckboxSelector from "@/components/EngineCheckboxSelector";
import { OutputsPanel } from "@/components/OutputsPanel";
import Samples, { samples } from "@/components/Samples";
import { ENGINE_KEYS, EngineKey, isEngineKey } from "@/lib/types";
import { useColorModeValue } from "@/components/ui/color-mode";
import { useEngineOutputsActions, useEngineOutputsState } from "@/store/useEngineOutputs";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const DEFAULT_SPLIT = [35, 65];

const tabs: { key: EngineKey; label: string }[] = [
  { key: EngineKey.v8, label: "V8" },
  { key: EngineKey.sm, label: "SpiderMonkey" },
  { key: EngineKey.hermes, label: "Hermes" },
  { key: EngineKey.jsc, label: "JSC" },
];

const createEngineSelection = (): Record<EngineKey, boolean> => ({
  [EngineKey.v8]: true,
  [EngineKey.sm]: false,
  [EngineKey.hermes]: false,
  [EngineKey.jsc]: false,
});

export default function PlaygroundClient() {
  const [code, setCode] = useState(samples.add);
  const [engines, setEngines] = useState<Record<EngineKey, boolean>>(() => createEngineSelection());
  const { status, showDiff } = useEngineOutputsState();
  const { runEngines, updateCurrentRunActiveTab, toggleDiff } = useEngineOutputsActions();
  const [activeTab, setActiveTab] = useState<EngineKey>(EngineKey.v8);
  const [sizes, setSizes] = useLocalStorage("splitter-sizes", DEFAULT_SPLIT);
  const [selectedV8Flags, setSelectedV8Flags] = useState<string[]>(["--print-bytecode"]);

  const pageBg = useColorModeValue("brand.800", "brand.800");
  const borderColor = useColorModeValue("#e2e8f0", "#262626");
  const textPrimary = useColorModeValue("#0f172a", "#e2e8f0");
  const panelBg = useColorModeValue("#1e1e1e", "#1e1e1e");

  const selectedEngines = useMemo(() => ENGINE_KEYS.filter((key) => engines[key]), [engines]);

  const handleEnginesChange = useCallback((values: EngineKey[]) => {
    setEngines(() => {
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
      return next;
    });
  }, []);

  const enabledTabs = useMemo(() => tabs.filter((tab) => engines[tab.key]), [engines]);
  const activeTabIndex = useMemo(() => {
    const idx = enabledTabs.findIndex((tab) => tab.key === activeTab);
    return idx >= 0 ? idx : 0;
  }, [enabledTabs, activeTab]);

  useEffect(() => {
    if (enabledTabs.length === 0) return;
    if (!enabledTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(enabledTabs[0].key);
    }
  }, [enabledTabs, activeTab]);

  useEffect(() => {
    updateCurrentRunActiveTab(activeTab);
  }, [activeTab, updateCurrentRunActiveTab]);

  const handleEditorChange = useCallback((value?: string) => {
    const next = value ?? "";
    setCode(next);
  }, []);

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

  const handleSampleSelect = useCallback((snippet: string) => {
    setCode(snippet);
  }, []);

  return (
    <Flex direction="column" bg={pageBg} color={textPrimary}>
      <Splitter.Root
        panels={[{ id: "editor", collapsible: true, collapsedSize: 5, minSize: 25 }, { id: "outputs" }]}
        defaultSize={sizes}
        onResizeEnd={(e) => setSizes(e.size)}
        minH="100vh"
      >
        <Splitter.Panel id="editor">
          <Flex bg={panelBg} flexDirection="column" height="100%">
            <HStack
              height={65}
              px={4}
              borderBottom="1px solid"
              justifyContent="space-between"
              borderColor={borderColor}
            >
              <Samples currentCode={code} onSelectSample={handleSampleSelect} />
              <Button size="md" w={120} onClick={run} loading={status === "running"} loadingText="Running">
                <CiPlay1 /> Run
              </Button>
            </HStack>
            <Flex flex={1} overflow="scroll">
              <EditorPanel code={code} onCodeChange={handleEditorChange} />
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
          <Flex bg={panelBg} flexDirection="column" height="100%">
            <HStack height={65} px={4} borderBottom="1px solid" justify="space-between" borderColor={borderColor}>
              <Button size="sm" variant="surface" colorPalette="white" onClick={toggleDiff}>
                {showDiff ? "Hide Diff" : "Show Diff"}
              </Button>
              <EngineCheckboxSelector
                selectedEngines={selectedEngines}
                onEnginesChange={handleEnginesChange}
                tabs={tabs}
              />
            </HStack>
            <Flex flex={1} overflow="scroll">
              <OutputsPanel
                enabledTabs={enabledTabs}
                activeTabIndex={activeTabIndex}
                activeTab={activeTab}
                onTabChange={(key) => setActiveTab(key)}
                selectedV8Flags={selectedV8Flags}
                setSelectedV8Flags={setSelectedV8Flags}
              />
            </Flex>
          </Flex>
        </Splitter.Panel>
      </Splitter.Root>
    </Flex>
  );
}
