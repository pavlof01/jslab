import { useMemo, useCallback } from "react";
import { Stack, Tabs, Text, HStack, Show, CodeBlock, createShikiAdapter } from "@chakra-ui/react";
import type { EngineResult } from "../../lib/types";
import { EngineKey } from "../../lib/types";
import { useColorModeValue } from "../ui/color-mode";
import type { Dispatch, SetStateAction } from "react";
import { HighlightedCode } from "./CodeBlock";
import { HighlighterGeneric } from "shiki";
import V8MenuControls from "./v8MenuControls";
import { DiffResult } from "@/utils/diff-bytcode";

const shikiAdapter = createShikiAdapter<HighlighterGeneric<any, any>>({
  async load() {
    const { createHighlighter } = await import("shiki");
    return createHighlighter({
      langs: ["actionscript-3"],
      themes: ["dark-plus"],
    });
  },
  theme: "dark-plus",
});

interface OutputsPanelProps {
  title: string;
  enabledTabs: { key: EngineKey; label: string }[];
  activeTabIndex: number;
  activeTab: EngineKey;
  onTabChange: (key: EngineKey) => void;
  out?: Record<EngineKey, EngineResult>;
  prevOut?: Record<EngineKey, EngineResult>;
  selectedV8Flags?: string[];
  setSelectedV8Flags?: Dispatch<SetStateAction<string[]>>;
  showFlagControls?: boolean;
}

export function OutputsPanel({
  title,
  enabledTabs,
  activeTabIndex,
  activeTab,
  onTabChange,
  out,
  prevOut,
  selectedV8Flags,
  setSelectedV8Flags,
  showFlagControls = true,
}: OutputsPanelProps) {
  if (!enabledTabs.length) {
    return null;
  }

  const currentValue = useMemo(() => {
    const fallback = enabledTabs[Math.min(activeTabIndex, enabledTabs.length - 1)]?.key ?? enabledTabs[0]?.key;
    const preferred = enabledTabs.some((tab) => tab.key === activeTab) ? activeTab : undefined;
    return preferred ?? fallback ?? EngineKey.v8;
  }, [activeTab, activeTabIndex, enabledTabs]);

  const handleTabChange = (detail: { value: string | null }) => {
    const next = (detail.value ?? currentValue) as EngineKey;
    if (next !== activeTab) {
      onTabChange(next);
    }
  };

  const subTextColor = useColorModeValue("#64748b", "#cbd5f5");
  const outputPreBg = useColorModeValue("#f1f5f9", "#111827");
  const activeKey = currentValue as EngineKey;
  const otherTabs = enabledTabs.filter((tab) => tab.key !== activeKey);
  const stdout = out?.[activeKey]?.stdout;
  const stderr = out?.[activeKey]?.stderr;
  const stdPrevOut = prevOut?.[activeKey]?.stdout;
  const stdPrevErr = prevOut?.[activeKey]?.stderr;

  const canRenderV8Controls = activeKey === EngineKey.v8 && showFlagControls && selectedV8Flags && setSelectedV8Flags;

  const renderDiff = useCallback(
    (diff?: DiffResult) => {
      if (!diff) return null;
      return (
        <HStack gap={1} fontSize="xs">
          <Text color={diff.added.length ? "green.400" : subTextColor}>+{diff.added.length}</Text>
          <Text color={diff.deleted.length ? "red.400" : subTextColor}>-{diff.deleted.length}</Text>
        </HStack>
      );
    },
    [subTextColor]
  );

  return (
    <Tabs.Root value={currentValue} onValueChange={handleTabChange} size="sm" variant="line" flex={1}>
      <Stack flex="1" minH={0} gap={4} display="flex" w="full">
        {/* <Show when={canRenderV8Controls}>
          <V8MenuControls selectedV8Flags={selectedV8Flags} setSelectedV8Flags={setSelectedV8Flags} />
        </Show> */}

        <Tabs.List w="full" border="0" ms="-1" flex="1">
          {enabledTabs.map((tab) => (
            <Tabs.Trigger colorPalette="teal" key={tab.key} value={tab.key} textStyle="xs">
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value={activeKey} flex="1" minH={0}>
          <Stack flex="1" minH={0} gap={4} borderRadius="md" bgColor={outputPreBg}>
            <HighlightedCode out={stdout} prev={stdPrevOut} />
            <HighlightedCode out={stderr} prev={stdPrevErr} EmptyCodeBlockState={() => <></>} />
          </Stack>
        </Tabs.Content>
      </Stack>
    </Tabs.Root>
  );
}
