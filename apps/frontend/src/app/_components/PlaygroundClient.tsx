"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, HStack, Show, Spacer, Text } from "@chakra-ui/react";
import { CiPlay1 } from "react-icons/ci";

import ActionsBarClosedEditor from "@/components/ActionBarClosedEditor";
import { EditorPanel } from "@/components/EditorPanel";
import EngineCheckboxSelector from "@/components/EngineCheckboxSelector";
import { HeaderBar } from "@/components/HeaderBar";
import { OutputsPanel } from "@/components/OutputsPanel";
import Samples, { samples } from "@/components/Samples";
import Splitter from "@/components/Splitter";
import { useSplitter } from "@/hooks/useSplitterScreen";
import { ENGINE_KEYS, EngineKey, isEngineKey } from "@/lib/types";
import { useColorModeValue } from "@/components/ui/color-mode";
import { useEngineOutputsActions, useEngineOutputsState } from "@/store/useEngineOutputs";

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
  const { resetSplitter, panelSplit, gridRef, editorCollapsed, handleSplitterPointerDown, handleSplitterDoubleClick } =
    useSplitter();
  const [selectedV8Flags, setSelectedV8Flags] = useState<string[]>(["--print-bytecode"]);

  const pageBg = useColorModeValue("#f8fafc", "#0f172a");
  const panelBg = useColorModeValue("#ffffff", "#1e293b");
  const borderColor = useColorModeValue("#e2e8f0", "#334155");
  const textPrimary = useColorModeValue("#0f172a", "#e2e8f0");

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
    <Flex direction="column" maxH="100vh" minH="100vh" bg={pageBg} color={textPrimary}>
      <Box as="header" px={6} py={4} height="8vh" borderBottom="1px solid" borderColor={borderColor} bg={panelBg}>
        <HeaderBar status={status} />
      </Box>

      <Flex ref={gridRef} gap={4} flex="1" maxH="92vh" px={6} py={4}>
        <Show when={!editorCollapsed}>
          <Box
            bg={panelBg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="lg"
            display="flex"
            flexDirection="column"
            overflow="hidden"
            minH={0}
            flexGrow={panelSplit}
            flexShrink={1}
            flexBasis="0%"
          >
            <HStack px={5} py={2} borderBottom="1px solid" justifyContent="space-between" borderColor={borderColor}>
              <Box>
                <Text fontWeight="semibold">Editor</Text>
              </Box>
              <Samples currentCode={code} onSelectSample={handleSampleSelect} />
              <Button
                size="xl"
                w={120}
                bgColor="green.300"
                onClick={run}
                loading={status === "running"}
                loadingText="Running"
              >
                <CiPlay1 /> Run
              </Button>
            </HStack>
            <EditorPanel code={code} onCodeChange={handleEditorChange} />
          </Box>
        </Show>

        <Splitter
          panelSplit={panelSplit}
          editorCollapsed={editorCollapsed}
          onPointerDown={handleSplitterPointerDown}
          onDoubleClick={handleSplitterDoubleClick}
        />

        <Flex
          bg={panelBg}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="lg"
          display="flex"
          flexDirection="column"
          overflow="hidden"
          minH={0}
          flexGrow={Math.max(0.1, 1 - panelSplit)}
          flexShrink={1}
          flexBasis="0%"
          position="relative"
        >
          <ActionsBarClosedEditor editorCollapsed={editorCollapsed} resetSplitter={resetSplitter} />

          <HStack p={4} borderBottom="1px solid" borderColor={borderColor}>
            <Text fontWeight="semibold">Outputs</Text>
            <Button
              size="sm"
              variant={showDiff ? "solid" : "outline"}
              colorScheme={showDiff ? "purple" : undefined}
              onClick={toggleDiff}
            >
              {showDiff ? "Hide Diff" : "Show Diff"}
            </Button>
            <Spacer />
            <EngineCheckboxSelector selectedEngines={selectedEngines} onEnginesChange={handleEnginesChange} tabs={tabs} />
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
      </Flex>
    </Flex>
  );
}
