"use client";

import { Button } from "@chakra-ui/react";

import { ShortcutHint } from "@/components/ui";
import { RunStatus } from "@/lib/types";
import { useRunStatus } from "@/store/engineOutputsSelectors";

import { useRunAndRecord } from "./useRunAndRecord";

const RunButton: React.FC = () => {
  const run = useRunAndRecord();
  const { status } = useRunStatus();
  const running = status === RunStatus.running;

  return (
    <Button variant="primary" size="md" onClick={run} disabled={running}>
      {running ? "running" : "run"}
      <ShortcutHint>⌘↵</ShortcutHint>
    </Button>
  );
};

export default RunButton;
