"use client";

import { useMemo } from "react";
import { CodeBlock, IconButton, Stack, Tabs, Text, HStack, Show, createShikiAdapter } from "@chakra-ui/react";
import { EngineKey } from "../../lib/types";
import type { EngineResult } from "../../lib/types";
import { useColorModeValue } from "../ui/color-mode";
import { HighlighterGeneric } from "shiki";
import V8FlagSelector from "../V8FlagSelector";
import V8Intrinsics from "../V8Intrinsics";
import type { Dispatch, SetStateAction } from "react";

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
  versions?: Record<EngineKey, string>;
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
  versions: _versions,
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
  const stdout = out?.[activeKey]?.stdout ?? "(no stdout)";
  const stderr = out?.[activeKey]?.stderr ?? "(no stderr)";

  const canRenderV8Controls = activeKey === EngineKey.v8 && showFlagControls && selectedV8Flags && setSelectedV8Flags;

  return (
    <CodeBlock.AdapterProvider value={shikiAdapter}>
      <Tabs.Root value={currentValue} onValueChange={handleTabChange} size="sm" variant="line" flex={1}>
        <Stack flex="1" minH={0} gap={4} display="flex" w="full">
          <Show when={canRenderV8Controls}>
            <Stack gap={2}>
              <HStack align="center" gap={2} flexWrap="wrap">
                <V8FlagSelector selectedV8Flags={selectedV8Flags!} setSelectedV8Flags={setSelectedV8Flags!} />
                <V8Intrinsics />
              </HStack>
              <Text fontSize="sm" color={subTextColor}>
                {selectedV8Flags?.length ? `Selected: ${selectedV8Flags.join(", ")}` : "Selected: None"}
              </Text>
            </Stack>
          </Show>

          <Stack flex="1" minH={0} gap={4}>
            <CodeBlock.Root
              code={stdout}
              language="actionscript-3"
              borderRadius="md"
              overflow="auto"
              bgColor={outputPreBg}
              flex="1"
              minH={0}
              display="flex"
              flexDirection="column"
              meta={{ showLineNumbers: true, wordWrap: true }}
            >
              <CodeBlock.Header borderBottomWidth="1px">
                <CodeBlock.Title>{title}</CodeBlock.Title>
                <Tabs.List w="full" border="0" ms="-1">
                  {enabledTabs.map((tab) => (
                    <Tabs.Trigger colorPalette="teal" key={tab.key} value={tab.key} textStyle="xs">
                      {tab.label}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>
                <CodeBlock.CopyTrigger asChild>
                  <IconButton variant="ghost" size="2xs">
                    <CodeBlock.CopyIndicator />
                  </IconButton>
                </CodeBlock.CopyTrigger>
              </CodeBlock.Header>
              <CodeBlock.Content flex="1" minH={0} display="flex" flexDirection="column" overflow="auto">
                {otherTabs.map((tab) => (
                  <Tabs.Content key={tab.key} value={tab.key} flex="1" />
                ))}
                <Tabs.Content pt="1" value={activeKey} flex="1" display="flex" minH={0}>
                  <CodeBlock.Code flex="1" minH={0}>
                    <CodeBlock.CodeText />
                  </CodeBlock.Code>
                </Tabs.Content>
              </CodeBlock.Content>
            </CodeBlock.Root>

            <CodeBlock.Root
              code={stderr}
              language="actionscript-3"
              borderRadius="md"
              overflow="auto"
              bgColor={outputPreBg}
              flex="1"
              minH={0}
              display="flex"
              flexDirection="column"
              meta={{ showLineNumbers: true, wordWrap: true }}
            >
              <CodeBlock.Header>
                <CodeBlock.Title>stderr</CodeBlock.Title>
                <CodeBlock.CopyTrigger asChild>
                  <IconButton variant="ghost" size="2xs">
                    <CodeBlock.CopyIndicator />
                  </IconButton>
                </CodeBlock.CopyTrigger>
              </CodeBlock.Header>
              <CodeBlock.Content flex="1" minH={0} display="flex" flexDirection="column" overflow="auto">
                {otherTabs.map((tab) => (
                  <Tabs.Content key={tab.key} value={tab.key} />
                ))}
                <Tabs.Content pt="1" value={activeKey} flex="1" display="flex" minH={0}>
                  <CodeBlock.Code flex="1" minH={0}>
                    <CodeBlock.CodeText />
                  </CodeBlock.Code>
                </Tabs.Content>
              </CodeBlock.Content>
            </CodeBlock.Root>
          </Stack>
        </Stack>
      </Tabs.Root>
    </CodeBlock.AdapterProvider>
  );
}
