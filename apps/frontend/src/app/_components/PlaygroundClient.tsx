"use client";

import { Box } from "@chakra-ui/react";
import { useCallback } from "react";

import { EditorPanel } from "@/components/EditorPanel";
import { SplitRow } from "@/components/ui";
import { pushHistory } from "@/lib/runHistory";
import { formatRunMeta } from "@/lib/runMessages";
import { enabledEngines } from "@/lib/types";
import {
  useCode,
  useEngineFlags,
  useEngineSelection,
  useRunEngines,
  useRunStatus,
  useSetCode,
} from "@/store/engineOutputsSelectors";

import { OutputPane } from "./OutputPane";
import * as styles from "./playground.styles";
import { PlaygroundToolbar } from "./PlaygroundToolbar";
import RunAnnouncer from "./RunAnnouncer";
import { RunMessage } from "./RunMessage";
import { useSharedStateRestore } from "./useSharedStateRestore";

export default function PlaygroundClient() {
  const code = useCode();
  const setCode = useSetCode();
  const { engines } = useEngineSelection();
  const { flags } = useEngineFlags();
  const { durationMs, cacheHit, error, notice } = useRunStatus();
  const runEngines = useRunEngines();

  useSharedStateRestore();

  const active = enabledEngines(engines);

  const run = useCallback(async () => {
    const outcome = await runEngines();
    if (outcome !== "done") return;
    pushHistory({ code, engines: active, flags }, () => crypto.randomUUID(), Date.now());
  }, [runEngines, code, active, flags]);

  return (
    <Box as="main" css={styles.frame}>
      <RunAnnouncer />
      <PlaygroundToolbar onRun={run} />
      <RunMessage error={error} notice={notice} />

      <SplitRow
        storageKey="jsl-split-playground"
        defaultPercent={30}
        minLeftPercent={20}
        minRightPercent={30}
        css={styles.splitRow}
        left={
          <Box css={styles.editorPane}>
            <Box css={styles.editorHost}>
              <EditorPanel code={code} onCodeChange={(value) => setCode(value ?? "")} onRun={run} />
            </Box>
          </Box>
        }
        right={
          <Box css={styles.outputPane}>
            <OutputPane />
          </Box>
        }
      />

      <Box css={styles.footerLine}>
        {footerText(formatRunMeta(durationMs, cacheHit), active.length)}
      </Box>
    </Box>
  );
}

function footerText(runMeta: string, engineCount: number): string {
  if (runMeta) return runMeta;
  return `${engineCount} engine${engineCount === 1 ? "" : "s"} · click any opcode for its reference`;
}
