"use client";

import { Box, CodeBlock, createShikiAdapter, For, IconButton, Stack, Tabs, Text } from "@chakra-ui/react";
import type { EngineKey, EngineResult } from "../../lib/types";
import { useColorModeValue } from "../ui/color-mode";
import { HighlighterGeneric } from "shiki";
import V8FlagSelector from "../V8FlagSelector";
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
  enabledTabs: { key: EngineKey; label: string }[];
  activeTabIndex: number;
  activeTab: EngineKey;
  onTabChange: (key: EngineKey) => void;
  out: Record<EngineKey, EngineResult>;
  versions?: Record<EngineKey, string>;
  selectedV8Flags: string[];
  setSelectedV8Flags: Dispatch<SetStateAction<string[]>>;
}

export function OutputsPanel({
  enabledTabs,
  activeTabIndex,
  activeTab,
  onTabChange,
  out,
  versions,
  selectedV8Flags,
  setSelectedV8Flags,
}: OutputsPanelProps) {
  const subTextColor = useColorModeValue("#64748b", "#cbd5f5");
  const outputPreBg = useColorModeValue("#f1f5f9", "#111827");
  const borderColor = useColorModeValue("#e2e8f0", "#334155");

  return (
    <CodeBlock.AdapterProvider value={shikiAdapter}>
      <Box flex="1" minH={0} py={4} px={2} display="flex" flexDirection="column">
        <Tabs.Root
          value={activeTab ?? enabledTabs[activeTabIndex]?.key}
          onValueChange={(detail) => {
            const next = (detail.value ?? enabledTabs[activeTabIndex]?.key) as EngineKey;
            onTabChange(next);
          }}
          fitted
          variant="plain"
        >
          <Tabs.List>
            <For each={enabledTabs}>
              {(variant) => (
                <Tabs.Trigger key={variant.key} value={variant.key}>
                  {variant.label}
                </Tabs.Trigger>
              )}
            </For>
            <Tabs.Indicator rounded="l2" bgColor="blue.800" />
          </Tabs.List>
          <For each={enabledTabs}>
            {(variant) => (
              <Tabs.Content key={variant.key} value={variant.key}>
                <Stack gap={4}>
                  {variant.key === "v8" ? (
                    <Stack gap={2}>
                      <V8FlagSelector selectedV8Flags={selectedV8Flags} setSelectedV8Flags={setSelectedV8Flags} />
                      <Text fontSize="sm" color={subTextColor}>
                        Selected: {selectedV8Flags.length ? selectedV8Flags.join(", ") : "None"}
                      </Text>
                    </Stack>
                  ) : null}
                  <CodeBlock.Root
                    as="pre"
                    p={4}
                    borderRadius="md"
                    overflowX="auto"
                    code={out[variant.key]?.stdout || "(no stdout)"}
                    language="actionscript-3"
                    bgColor={outputPreBg}
                  >
                    <CodeBlock.Header>
                      <CodeBlock.Title>stdout</CodeBlock.Title>
                      <CodeBlock.CopyTrigger asChild>
                        <IconButton variant="ghost" size="2xs">
                          <CodeBlock.CopyIndicator />
                        </IconButton>
                      </CodeBlock.CopyTrigger>
                    </CodeBlock.Header>
                    <CodeBlock.Content>
                      <CodeBlock.Code>
                        <CodeBlock.CodeText />
                      </CodeBlock.Code>
                    </CodeBlock.Content>
                  </CodeBlock.Root>
                  <Box>
                    <CodeBlock.Root
                      as="pre"
                      p={4}
                      borderRadius="md"
                      overflowX="auto"
                      code={out[variant.key]?.stderr || "(no stderr)"}
                      language="actionscript-3"
                      bgColor={outputPreBg}
                    >
                      <CodeBlock.Header>
                        <CodeBlock.Title>stderr</CodeBlock.Title>
                        <CodeBlock.CopyTrigger asChild>
                          <IconButton variant="ghost" size="2xs">
                            <CodeBlock.CopyIndicator />
                          </IconButton>
                        </CodeBlock.CopyTrigger>
                      </CodeBlock.Header>
                      <CodeBlock.Content>
                        <CodeBlock.Code>
                          <CodeBlock.CodeText />
                        </CodeBlock.Code>
                      </CodeBlock.Content>
                    </CodeBlock.Root>
                  </Box>
                </Stack>
              </Tabs.Content>
            )}
          </For>
        </Tabs.Root>
      </Box>
    </CodeBlock.AdapterProvider>
  );
}
