"use client";

import { Box } from "@chakra-ui/react";
import { useState } from "react";

import { HighlightedCode } from "@/components/OutputsPanel/CodeBlock";
import { enabledEngines, type EngineKey, RunStatus } from "@/lib/types";
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
        {status === RunStatus.running ? null : (
          <PreludeSection
            key={activeTab}
            engine={activeTab}
            prelude={result?.preludeStdout}
            previousPrelude={previous?.preludeStdout}
            showDiff={showDiff}
          />
        )}
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
            showSourceAlerts={!result.stdout}
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

type PreludeSectionProps = {
  engine: EngineKey;
  prelude?: string;
  previousPrelude?: string;
  showDiff: boolean;
};

export const PreludeSection: React.FC<PreludeSectionProps> = ({
  engine,
  prelude,
  previousPrelude,
  showDiff,
}) => {
  const [open, setOpen] = useState(false);
  if (!prelude) return null;

  const lines = prelude.split("\n").length;

  return (
    <>
      <Box
        as="button"
        css={styles.preludeToggle}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">{open ? "▾" : "▸"}</span>
        <span>sandbox prelude</span>
        <Box as="span" css={styles.preludeMeta}>
          {lines} line{lines === 1 ? "" : "s"} · {open ? "shown" : "hidden"}
        </Box>
      </Box>
      {open ? (
        <HighlightedCode
          engineKey={engine}
          out={prelude}
          prev={previousPrelude}
          showDiff={showDiff}
          emptyState={null}
        />
      ) : null}
    </>
  );
};

export default OutputPane;
