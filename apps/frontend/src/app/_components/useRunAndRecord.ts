"use client";

import { useCallback } from "react";

import { pushHistory } from "@/lib/runHistory";
import { readCurrentRun, useRunEngines } from "@/store/engineOutputsSelectors";

export function useRunAndRecord(): () => Promise<void> {
  const runEngines = useRunEngines();

  return useCallback(async () => {
    const outcome = await runEngines();
    if (outcome !== "done") return;
    const run = readCurrentRun();
    if (!run) return;
    pushHistory(
      { code: run.code, engines: run.engines, flags: run.flags },
      () => crypto.randomUUID(),
      Date.now(),
    );
  }, [runEngines]);
}
