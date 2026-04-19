import { useMemo } from "react";
import { Show, Stack, Tabs } from "@chakra-ui/react";
import { EngineKey, RunStatus } from "../../lib/types";
import { HighlightedCode } from "./CodeBlock";
import V8MenuControls from "./v8MenuControls";
import { useEngineOutputsActions, useEngineOutputsState } from "@/store/useEngineOutputs";

export const tabs: { key: EngineKey; label: string }[] = [
  { key: EngineKey.v8, label: "V8" },
  { key: EngineKey.sm, label: "SpiderMonkey" },
  { key: EngineKey.hermes, label: "Hermes" },
  { key: EngineKey.jsc, label: "JSC" },
];

export function OutputsPanel() {
  const { out, previousSnapshot, showDiff, status, engines, activeTab } = useEngineOutputsState();
  const { setActiveTab } = useEngineOutputsActions();

  const enabledTabs = useMemo(() => tabs.filter((tab) => engines[tab.key]), [engines]);
  const activeTabIndex = useMemo(() => {
    const idx = enabledTabs.findIndex((tab) => tab.key === activeTab);
    return idx >= 0 ? idx : 0;
  }, [enabledTabs, activeTab]);

  const handleTabChange = (detail: { value: string | null }) => {
    const next = (detail.value ?? activeKey) as EngineKey;
    if (next !== activeTab) {
      setActiveTab(next);
    }
  };

  const activeKey = enabledTabs[activeTabIndex].key || EngineKey.v8;
  const stdout = out?.[activeKey]?.stdout;
  const stderr = out?.[activeKey]?.stderr;
  const stdPrevOut = previousSnapshot?.out?.[activeKey]?.stdout;
  const stdPrevErr = previousSnapshot?.out?.[activeKey]?.stderr;

  const canRenderV8Controls = activeKey === EngineKey.v8;

  return (
    <Tabs.Root value={activeKey} onValueChange={handleTabChange} display="flex" size="sm" variant="line" flex="1">
      <Stack flex="1" minH="20vh" w="full">
        <Tabs.List w="full" ms="-1" px={4}>
          {enabledTabs.map((tab) => (
            <Tabs.Trigger colorPalette="teal" key={tab.key} value={tab.key} textStyle="xs">
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value={activeKey} display="flex" flex="1" minH="20vh">
          <Stack flex="1" minH={0} gap={4} borderRadius="md" bgColor="background.200" p={4} overflow="auto">
            <Show when={canRenderV8Controls}>
              <V8MenuControls />
            </Show>
            <HighlightedCode
              engineKey={activeKey}
              out={stdout}
              prev={stdPrevOut}
              showDiff={showDiff}
              isLoading={status === RunStatus.running}
            />
            <HighlightedCode
              engineKey={activeKey}
              out={stderr}
              prev={stdPrevErr}
              showDiff={showDiff}
              EmptyCodeBlockState={() => <></>}
            />
          </Stack>
        </Tabs.Content>
      </Stack>
    </Tabs.Root>
  );
}
