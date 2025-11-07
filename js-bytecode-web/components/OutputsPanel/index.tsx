import { Stack, Tabs } from "@chakra-ui/react";
import { EngineKey } from "../../lib/types";
import { useColorModeValue } from "../ui/color-mode";
import type { Dispatch, SetStateAction } from "react";
import { HighlightedCode } from "./CodeBlock";
import V8MenuControls from "./v8MenuControls";
import { DiffResult } from "@/utils/diff-bytcode";
import { useEngineOutputsState } from "@/store/useEngineOutputs";

interface OutputsPanelProps {
  enabledTabs: { key: EngineKey; label: string }[];
  activeTabIndex: number;
  activeTab: EngineKey;
  onTabChange: (key: EngineKey) => void;
  selectedV8Flags?: string[];
  setSelectedV8Flags?: Dispatch<SetStateAction<string[]>>;
}

export function OutputsPanel({
  enabledTabs,
  activeTabIndex,
  activeTab,
  onTabChange,
  selectedV8Flags,
  setSelectedV8Flags,
}: OutputsPanelProps) {
  const { out, previousSnapshot } = useEngineOutputsState();

  const handleTabChange = (detail: { value: string | null }) => {
    const next = (detail.value ?? activeKey) as EngineKey;
    if (next !== activeTab) {
      onTabChange(next);
    }
  };

  const outputPreBg = useColorModeValue("#f1f5f9", "#111827");
  const activeKey = enabledTabs[activeTabIndex].key || EngineKey.v8;
  const stdout = out?.[activeKey]?.stdout;
  const stderr = out?.[activeKey]?.stderr;
  const stdPrevOut = previousSnapshot?.out?.[activeKey]?.stdout;
  const stdPrevErr = previousSnapshot?.out?.[activeKey]?.stderr;

  const canRenderV8Controls = activeKey === EngineKey.v8 && selectedV8Flags && setSelectedV8Flags;

  return (
    <Tabs.Root value={activeKey} onValueChange={handleTabChange} size="sm" variant="line" flex={1}>
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
