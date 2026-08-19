"use client";

import { HighlightedCode } from "@/components/OutputsPanel/CodeBlock";
import { Box } from "@chakra-ui/react";
import BytecodeLegend from "@/components/OutputsPanel/components/BytecodeLegend";
import { EngineKey, RunStatus } from "@/lib/types";
import {
  useActiveTab,
  useDiffToggle,
  useEngineSelection,
  useOutputPane as useOutputPaneState,
  useEngineFlags,
} from "@/store/engineOutputsSelectors";
import { enabledEngines } from "@/lib/types";
import { EngineNote } from "./EngineNote";
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
  const showingV8 = activeTab === EngineKey.v8;

  return (
    <>
      <EngineTabs engines={active} activeTab={activeTab} onSelect={setActiveTab} out={out} status={status} />

      <EngineNote engine={activeTab} />
      {showingV8 ? <BytecodeLegend /> : null}

      <Box css={styles.outputScroller}>
        <HighlightedCode
          engineKey={activeTab}
          out={result?.stdout}
          prev={previous?.stdout}
          showDiff={showDiff}
          isLoading={status === RunStatus.running}
        />
        <StderrDump engine={activeTab} stderr={result?.stderr} previousStderr={previous?.stderr} showDiff={showDiff} />
      </Box>

      <PaneFooter durationMs={result?.ms} flagCount={flagsFor(activeTab).length} />
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

function PaneFooter({ durationMs, flagCount }: { durationMs?: number; flagCount: number }) {
  return (
    <Box css={styles.outputFooter}>
      <span>{durationMs ? `${durationMs} ms` : "—"}</span>
      {flagCount > 0 ? (
        <span>
          {flagCount} flag{flagCount === 1 ? "" : "s"}
        </span>
      ) : null}
    </Box>
  );
}
