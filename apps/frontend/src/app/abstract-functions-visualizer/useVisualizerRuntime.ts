"use client";

import { useCallback, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { useAutoTrace, useFunctionCatalog, usePlayback, useSpecHtml } from "./effects";
import type { VisualizerInitialData } from "./model";
import { useVisualizerStore, useVisualizerStoreApi } from "./StoreProvider";

/**
 * Assembles what the visualizer screen renders: the trace, the input, the
 * playback position, and the handful of actions the UI drives them with. The
 * background work each of those needs lives in ./effects.
 */
export function useVisualizerRuntime(resolvedInitialData: VisualizerInitialData) {
  const initialKey = `${resolvedInitialData.category}:${resolvedInitialData.selectedAlgo}:${resolvedInitialData.input}`;

  const storeApi = useVisualizerStoreApi();

  // Navigating between /type-conversion and /equality re-renders this hook with
  // fresh server data; re-seed the store rather than trace the old input again.
  const [seededKey, setSeededKey] = useState(initialKey);
  if (seededKey !== initialKey) {
    storeApi.getState().initializeFromServer(resolvedInitialData);
    setSeededKey(initialKey);
  }

  const trace = useVisualizerStore(
    useShallow((s) => ({
      root: s.root,
      error: s.error,
      isTracing: s.isTracing,
      flatEntries: s.flatEntries,
      specHtml: s.specHtml,
      effectiveAlgoId: s.effectiveAlgoId,
      detectedOperator: s.detectedOperator,
    })),
  );

  const input = useVisualizerStore(
    useShallow((s) => ({
      category: s.category,
      selectedAlgo: s.selectedAlgo,
      traceInputRaw: s.traceInputRaw,
      traceInputExpression: s.traceInputExpression,
      traceRequestId: s.traceRequestId,
      functionOptions: s.functionOptions,
      functionMeta: s.functionMeta,
    })),
  );

  const playback = useVisualizerStore(useShallow((s) => ({ selectedIndex: s.selectedIndex, isPlaying: s.isPlaying })));

  const setIsPlaying = useVisualizerStore((s) => s.setIsPlaying);
  const setSelectedAlgo = useVisualizerStore((s) => s.setSelectedAlgo);
  const setTraceInputRaw = useVisualizerStore((s) => s.setTraceInputRaw);
  const commitTraceInput = useVisualizerStore((s) => s.commitTraceInput);
  const onSelectIndex = useVisualizerStore((s) => s.onSelectIndex);

  useSpecHtml(initialKey, input.selectedAlgo, resolvedInitialData);
  useAutoTrace(initialKey, input, resolvedInitialData);
  usePlayback(playback.isPlaying, trace.flatEntries.length);
  useFunctionCatalog(input.functionOptions.length);

  const togglePlay = useCallback(() => {
    const { isPlaying, selectedIndex, flatEntries } = storeApi.getState();
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    // Pressing play at the end restarts rather than sitting on the last step.
    if (flatEntries.length > 0 && selectedIndex >= flatEntries.length - 1) onSelectIndex(0);
    setIsPlaying(true);
  }, [onSelectIndex, setIsPlaying, storeApi]);

  const pickExpression = useCallback(
    (value: string) => {
      setTraceInputRaw(value);
      commitTraceInput(value);
    },
    [commitTraceInput, setTraceInputRaw],
  );

  return {
    ...trace,
    ...input,
    ...playback,
    setSelectedAlgo,
    setTraceInputRaw,
    commitTraceInput,
    onSelectIndex,
    togglePlay,
    pickExpression,
  };
}
