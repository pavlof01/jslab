"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionBar, Box, Button, Flex, HStack, Portal, Show, Spacer, Text } from "@chakra-ui/react";
import { HeaderBar } from "../components/HeaderBar";
import { EditorPanel } from "../components/EditorPanel";
import { OutputsPanel } from "../components/OutputsPanel";
import { ENGINE_KEYS, EngineKey, isEngineKey } from "../lib/types";
import { useColorModeValue } from "@/components/ui/color-mode";
import EngineCheckboxSelector from "@/components/EngineCheckboxSelector";
import { CiPlay1 } from "react-icons/ci";
import { LuPanelLeftClose, LuPanelLeftOpen } from "react-icons/lu";
import Samples, { samples } from "@/components/Samples";
import { useEngineOutputsActions, useEngineOutputsState } from "@/store/useEngineOutputs";
import { useSplitter } from "@/hooks/useSplitterScreen";
import Splitter from "@/components/Splitter";

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

export default function Page() {
  const [code, setCode] = useState(samples.add);
  const [engines, setEngines] = useState<Record<EngineKey, boolean>>(() => createEngineSelection());
  const { status, previousSnapshot } = useEngineOutputsState();
  const { runEngines, updateCurrentRunActiveTab } = useEngineOutputsActions();
  const [activeTab, setActiveTab] = useState<EngineKey>(EngineKey.v8);
  const { resetSplitter, panelSplit, gridRef, editorCollapsed, handleSplitterPointerDown, handleSplitterDoubleClick } =
    useSplitter();
  const [showDiff, setShowDiff] = useState(true);
  const [selectedV8Flags, setSelectedV8Flags] = useState<string[]>(["--print-bytecode"]);
  const [previousPanelTab, setPreviousPanelTab] = useState<EngineKey>(EngineKey.v8);

  const pageBg = useColorModeValue("#f8fafc", "#0f172a");
  const panelBg = useColorModeValue("#ffffff", "#1e293b");
  const borderColor = useColorModeValue("#e2e8f0", "#334155");
  const textPrimary = useColorModeValue("#0f172a", "#e2e8f0");

  const selectedEngines = useMemo(() => ENGINE_KEYS.filter((key) => engines[key]), [engines]);

  const previousTabs = useMemo(
    () => (previousSnapshot ? tabs.filter((tab) => previousSnapshot.engines.includes(tab.key)) : []),
    [previousSnapshot]
  );

  const previousActiveTabIndex = useMemo(() => {
    if (!previousTabs.length) return 0;
    const idx = previousTabs.findIndex((tab) => tab.key === previousPanelTab);
    return idx >= 0 ? idx : 0;
  }, [previousPanelTab, previousTabs]);

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
    if (!previousSnapshot) return;
    const available = tabs.filter((tab) => previousSnapshot.engines.includes(tab.key));
    if (available.length === 0) return;
    const preferred = available.find((tab) => tab.key === previousSnapshot.activeTab) ?? available[0];
    setPreviousPanelTab(preferred.key);
  }, [previousSnapshot]);

  useEffect(() => {
    updateCurrentRunActiveTab(activeTab);
  }, [activeTab, updateCurrentRunActiveTab]);

  const hasPreviousSnapshot = Boolean(previousSnapshot) && previousTabs.length > 0;

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
    <Flex direction="column" minH="100vh" bg={pageBg} color={textPrimary}>
      <Box as="header" px={6} py={4} borderBottom="1px solid" borderColor={borderColor} bg={panelBg}>
        <HeaderBar status={status} />
      </Box>

      <Flex ref={gridRef} gap={4} flex="1" px={6} py={4} align="stretch">
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

        <Box
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
          <ActionBar.Root open={editorCollapsed}>
            <Portal>
              <ActionBar.Positioner bottom="32px" left="32px">
                <ActionBar.Content shadow="lg" borderRadius="lg">
                  <ActionBar.SelectionTrigger display="flex" alignItems="center" gap={2}>
                    <LuPanelLeftClose />
                    Editor Hidden
                  </ActionBar.SelectionTrigger>
                  <ActionBar.Separator />
                  <Button size="sm" colorScheme="blue" onClick={resetSplitter}>
                    Show Editor <LuPanelLeftOpen />
                  </Button>
                </ActionBar.Content>
              </ActionBar.Positioner>
            </Portal>
          </ActionBar.Root>

          <HStack px={4} py={4} borderBottom="1px solid" borderColor={borderColor}>
            <Text fontWeight="semibold">Outputs</Text>
            <Button
              size="sm"
              variant={showDiff ? "solid" : "outline"}
              colorScheme={showDiff ? "purple" : undefined}
              onClick={() => setShowDiff((prev) => !prev)}
            >
              {showDiff ? "Hide Diff" : "Show Diff"}
            </Button>
            <Spacer />
            <EngineCheckboxSelector
              selectedEngines={selectedEngines}
              onEnginesChange={handleEnginesChange}
              tabs={tabs}
            />
          </HStack>
          <Flex flex="1" minH="0" gap={4} px={4} py={4} overflow="hidden">
            <Box flex="1" minH="0" display="flex">
              <OutputsPanel
                enabledTabs={enabledTabs}
                activeTabIndex={activeTabIndex}
                activeTab={activeTab}
                onTabChange={(key) => setActiveTab(key)}
                selectedV8Flags={selectedV8Flags}
                setSelectedV8Flags={setSelectedV8Flags}
              />
            </Box>
          </Flex>
        </Box>
      </Flex>
    </Flex>
  );
}
