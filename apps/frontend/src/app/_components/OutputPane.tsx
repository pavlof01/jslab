"use client";

import { Box } from "@chakra-ui/react";
import { useEngineVersion } from "@/components/EngineVersion/context";
import { HighlightedCode } from "@/components/OutputsPanel/CodeBlock";
import { engineLabel } from "@/lib/engines";
import { EngineKey, enabledEngines, RunStatus } from "@/lib/types";
import {
  useActiveTab,
  useDiffToggle,
  useEngineFlags,
  useEngineSelection,
  useOutputPane as useOutputPaneState,
} from "@/store/engineOutputsSelectors";
import { EngineTabs } from "./EngineTabs";
import * as styles from "./playground.styles";

export function OutputPane() {
  const { engines } = useEngineSelection();
  const { activeTab, setActiveTab } = useActiveTab();
  const { showDiff } = useDiffToggle();
  const { out, previousSnapshot, status } = useOutputPaneState();
  const { flagsFor } = useEngineFlags();

  const active = enabledEngines(engines);
  const result = out?.[activeTab];
  const previous = previousSnapshot?.out?.[activeTab];
  const _showingV8 = activeTab === EngineKey.v8;

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
        />
        <StderrDump
          engine={activeTab}
          stderr={result?.stderr}
          previousStderr={previous?.stderr}
          showDiff={showDiff}
        />
      </Box>

      <PaneFooter
        engine={activeTab}
        durationMs={result?.ms}
        flagCount={flagsFor(activeTab).length}
      />
    </>
  );
}

function StderrDump({
  engine,
  stderr,
  previousStderr,
  showDiff,
}: {
  engine: EngineKey;
  stderr?: string;
  previousStderr?: string;
  showDiff: boolean;
}) {
  if (!stderr) return null;

  return (
    <HighlightedCode
      engineKey={engine}
      out={stderr}
      prev={previousStderr}
      showDiff={showDiff}
      EmptyCodeBlockState={() => <></>}
    />
  );
}

function PaneFooter({
  engine,
  durationMs,
  flagCount,
}: {
  engine: EngineKey;
  durationMs?: number;
  flagCount: number;
}) {
  const version = useEngineVersion(engine);

  return (
    <Box css={styles.outputFooter}>
      {version ? (
        <span>
          {engineLabel(engine)} {version}
        </span>
      ) : null}
      <span>{durationMs ? `${durationMs} ms` : "—"}</span>
      {flagCount > 0 ? (
        <span>
          {flagCount} flag{flagCount === 1 ? "" : "s"}
        </span>
      ) : null}
    </Box>
  );
}
