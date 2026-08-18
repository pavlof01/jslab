"use client";

import Samples from "@/components/Samples";
import V8FlagSelector from "@/components/V8FlagSelector";
import V8Intrinsics from "@/components/V8Intrinsics";
import { Box, Button } from "@chakra-ui/react";
import { Chip, ShortcutHint } from "@/components/ui";
import { engineLabel } from "@/lib/engines";
import { createEngineSelection, enabledEngines, ENGINE_KEYS, EngineKey, RunStatus } from "@/lib/types";
import { useCode, useDiffToggle, useEngineSelection, useRunStatus, useSetCode } from "@/store/engineOutputsSelectors";
import RunHistory from "./RunHistory";
import ShareButton from "./ShareButton";
import * as styles from "./playground.styles";

export function PlaygroundToolbar({ onRun }: { onRun: () => void }) {
  const code = useCode();
  const setCode = useSetCode();
  const { engines, setEngines } = useEngineSelection();
  const { showDiff, toggleDiff } = useDiffToggle();
  const { status } = useRunStatus();

  const running = status === RunStatus.running;

  const toggleEngine = (engine: EngineKey) => {
    if (engine === EngineKey.v8) return;
    const active = enabledEngines(engines);
    const next = engines[engine] ? active.filter((other) => other !== engine) : [...active, engine];
    setEngines(createEngineSelection(next));
  };

  return (
    <Box css={styles.toolbar}>
      <Box css={styles.toolbarEngines}>
        {ENGINE_KEYS.map((engine) => (
          <Chip
            key={engine}
            label={engineLabel(engine)}
            checked={engines[engine]}
            disabled={engine === EngineKey.v8}
            title={engine === EngineKey.v8 ? "V8 is always on" : undefined}
            onToggle={() => toggleEngine(engine)}
          />
        ))}
        <V8FlagSelector />
        <V8Intrinsics />
      </Box>

      <Box css={styles.toolbarActions}>
        <Samples currentCode={code} onSelectSample={setCode} />
        <RunHistory />
        <ShareButton />
        <Button size="sm" onClick={toggleDiff} active={showDiff}>
          diff
        </Button>
        <Button variant="primary" size="md" onClick={onRun} disabled={running}>
          {running ? "running" : "run"}
          <ShortcutHint>⌘↵</ShortcutHint>
        </Button>
      </Box>
    </Box>
  );
}
