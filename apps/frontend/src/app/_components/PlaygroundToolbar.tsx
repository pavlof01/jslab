"use client";

import { Box, Button } from "@chakra-ui/react";

import FlagSelector from "@/components/FlagSelector";
import { useFlaggedEngines } from "@/components/FlagSelector/context";
import Samples from "@/components/Samples";
import { Chip, ShortcutHint } from "@/components/ui";
import V8Intrinsics from "@/components/V8Intrinsics";
import { engineLabel } from "@/lib/engines";
import {
  createEngineSelection,
  ENGINE_KEYS,
  EngineKey,
  enabledEngines,
  RunStatus,
} from "@/lib/types";
import {
  useCode,
  useDiffToggle,
  useEngineSelection,
  useRunStatus,
  useSetCode,
} from "@/store/engineOutputsSelectors";

import * as styles from "./playground.styles";
import RunHistory from "./RunHistory";
import ShareButton from "./ShareButton";

export function PlaygroundToolbar({ onRun }: { onRun: () => void }) {
  const code = useCode();
  const setCode = useSetCode();
  const { engines, setEngines } = useEngineSelection();
  const { showDiff, toggleDiff } = useDiffToggle();
  const { status } = useRunStatus();
  const flaggedEngines = useFlaggedEngines();

  const running = status === RunStatus.running;
  // A picker for an engine that is switched off would offer flags nothing will
  // run, so the toolbar shows one per enabled engine that has flags to give.
  const flagPickers = flaggedEngines.filter((engine) => engines[engine]);

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
        {flagPickers.map((engine) => (
          <FlagSelector key={engine} engine={engine} />
        ))}
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
