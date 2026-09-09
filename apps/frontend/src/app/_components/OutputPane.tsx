"use client";

import { Box } from "@chakra-ui/react";

import { HighlightedCode } from "@/components/OutputsPanel/CodeBlock";
import { enabledEngines, RunStatus } from "@/lib/types";
import {
  useActiveTab,
  useDiffToggle,
  useEngineFlags,
  useEngineSelection,
  useOutputPane as useOutputPaneState,
} from "@/store/engineOutputsSelectors";

import EngineTabs from "./EngineTabs";
import OutputPaneFooter from "./OutputPaneFooter";
import * as styles from "./playground.styles";

const OutputPane: React.FC = () => {
  const { engines } = useEngineSelection();
  const { activeTab, setActiveTab } = useActiveTab();
  const { showDiff } = useDiffToggle();
  const { out, previousSnapshot, status, currentRun } = useOutputPaneState();
  const { flagsFor } = useEngineFlags();

  const active = enabledEngines(engines);
  const result = out?.[activeTab];
  const previous = previousSnapshot?.out?.[activeTab];

  return (
    <>
      <EngineTabs
        engines={active}
        activeTab={activeTab}
        onSelect={setActiveTab}
        out={out}
        status={status}
      />

      <Box css={styles.outputScroller}>
        <HighlightedCode
          engineKey={activeTab}
          out={result?.stdout}
          prev={previous?.stdout}
          showDiff={showDiff}
          isLoading={status === RunStatus.running}
          source={currentRun?.code}
        />
        {result?.stderr ? (
          <HighlightedCode
            engineKey={activeTab}
            out={result.stderr}
            prev={previous?.stderr}
            showDiff={showDiff}
            source={currentRun?.code}
            emptyState={null}
          />
        ) : null}
      </Box>

      <OutputPaneFooter
        engine={activeTab}
        durationMs={result?.ms}
        flagCount={flagsFor(activeTab).length}
      />
    </>
  );
};

export default OutputPane;
