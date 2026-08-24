"use client";

import { useEffect, useRef } from "react";

import { getJson, getText } from "@/lib/http";
import type { FunctionCatalog, VisualizerInitialData } from "./model";
import { useVisualizerStore } from "./StoreProvider";

/**
 * The visualizer's background work, one hook per job.
 *
 * These used to be four unrelated effects stacked inside useVisualizerRuntime —
 * fetching spec HTML, debouncing a trace, stepping playback, loading the
 * function catalog — sharing nothing but the file they lived in. Split out,
 * each states its own trigger and cleanup, and the runtime hook is left doing
 * what its name says: assembling the screen's state.
 */

const TRACE_DEBOUNCE_MS = 150;
const PLAYBACK_MS = 650;

/**
 * Both fetching hooks below have to skip the first render when the server
 * already delivered the answer, and stop skipping the moment anything the user
 * controls changes. This ref is that "the seed is still good" bit.
 */
function useSeedGuard(initialKey: string) {
  const seeded = useRef<string | null>(initialKey);
  return (stillSeeded: boolean) => {
    const useSeed = seeded.current === initialKey && stillSeeded;
    seeded.current = null;
    return useSeed;
  };
}

/** Keep the spec panel in step with the selected algorithm. */
export function useSpecHtml(
  initialKey: string,
  selectedAlgo: string,
  initial: VisualizerInitialData,
): void {
  const setSpecHtml = useVisualizerStore((s) => s.setSpecHtml);
  const consumeSeed = useSeedGuard(initialKey);

  useEffect(() => {
    if (consumeSeed(Boolean(initial.specHtml) && selectedAlgo === initial.selectedAlgo)) return;

    void getText(`/api/spec/${encodeURIComponent(selectedAlgo)}`).then((html) =>
      setSpecHtml(html ?? ""),
    );
    // consumeSeed is stable for the life of the hook; re-running on it would
    // defeat the guard it implements.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey, selectedAlgo, initial.selectedAlgo, initial.specHtml, setSpecHtml]);
}

/** Re-trace shortly after the input settles, so typing doesn't fire a request per keystroke. */
export function useAutoTrace(
  initialKey: string,
  input: { selectedAlgo: string; traceInputExpression: string; traceRequestId: number },
  initial: VisualizerInitialData,
): void {
  const runNow = useVisualizerStore((s) => s.runNow);
  const consumeSeed = useSeedGuard(initialKey);

  useEffect(() => {
    const seedStillGood =
      Boolean(initial.trace.root) &&
      input.selectedAlgo === initial.selectedAlgo &&
      input.traceInputExpression === initial.input &&
      input.traceRequestId === 0;
    if (consumeSeed(seedStillGood)) return;

    const timer = window.setTimeout(runNow, TRACE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialKey,
    input.selectedAlgo,
    input.traceInputExpression,
    input.traceRequestId,
    initial.input,
    initial.selectedAlgo,
    initial.trace.root,
    runNow,
  ]);
}

/** Advance the highlighted step while playback is on. */
export function usePlayback(isPlaying: boolean, stepCount: number): void {
  const tickPlayback = useVisualizerStore((s) => s.tickPlayback);

  useEffect(() => {
    if (!isPlaying || stepCount <= 1) return;
    const id = window.setInterval(tickPlayback, PLAYBACK_MS);
    return () => window.clearInterval(id);
  }, [isPlaying, stepCount, tickPlayback]);
}

/** Fill the algorithm picker when the server rendered without a catalog. */
export function useFunctionCatalog(optionCount: number): void {
  const setFunctionCatalog = useVisualizerStore((s) => s.setFunctionCatalog);

  useEffect(() => {
    if (optionCount > 0) return;

    void getJson<Partial<FunctionCatalog>>("/api/trace/functions").then((data) => {
      if (!data?.available_functions?.length) return;
      setFunctionCatalog({
        available_functions: data.available_functions,
        function_meta: data.function_meta ?? {},
      });
    });
  }, [optionCount, setFunctionCatalog]);
}
