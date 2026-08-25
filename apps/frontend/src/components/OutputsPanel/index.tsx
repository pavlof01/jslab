import { Stack, Tabs } from "@chakra-ui/react";
import { useMemo } from "react";

import { engineLabel } from "@/lib/engines";
import { ENGINE_KEYS, EngineKey, isEngineKey, RunStatus } from "@/lib/types";
import { useActiveTab, useOutputPane } from "@/store/engineOutputsSelectors";

import { HighlightedCode } from "./CodeBlock";

export function OutputsPanel() {
  const { out, previousSnapshot, showDiff, status, engines } = useOutputPane();
  const { activeTab, setActiveTab } = useActiveTab();

  const enabledTabs = useMemo(() => ENGINE_KEYS.filter((engine) => engines[engine]), [engines]);

  const activeKey = enabledTabs.includes(activeTab) ? activeTab : (enabledTabs[0] ?? EngineKey.v8);

  const result = out?.[activeKey];
  const previous = previousSnapshot?.out?.[activeKey];

  return (
    <Tabs.Root
      value={activeKey}
      onValueChange={({ value }) => {
        if (isEngineKey(value) && value !== activeTab) setActiveTab(value);
      }}
      display="flex"
      size="sm"
      variant="line"
      flex="1"
    >
      <Stack flex="1" minH="20vh" w="full">
        <Tabs.List w="full" ms="-1" px={4}>
          {enabledTabs.map((engine) => (
            <Tabs.Trigger key={engine} value={engine} textStyle="xs">
              {engineLabel(engine)}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value={activeKey} display="flex" flex="1" minH="20vh">
          <Stack
            flex="1"
            minH={0}
            gap={4}
            borderRadius="md"
            bgColor="surface.base"
            p={4}
            overflow="auto"
          >
            <HighlightedCode
              engineKey={activeKey}
              out={result?.stdout}
              prev={previous?.stdout}
              showDiff={showDiff}
              isLoading={status === RunStatus.running}
            />
            <HighlightedCode
              engineKey={activeKey}
              out={result?.stderr}
              prev={previous?.stderr}
              showDiff={showDiff}
              EmptyCodeBlockState={() => <></>}
            />
          </Stack>
        </Tabs.Content>
      </Stack>
    </Tabs.Root>
  );
}
