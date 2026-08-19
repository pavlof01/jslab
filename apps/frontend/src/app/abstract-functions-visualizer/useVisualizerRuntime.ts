"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import type { FunctionCatalog, VisualizerInitialData } from "./model";
import { useVisualizerStore, useVisualizerStoreApi } from "./StoreProvider";

const TRACE_DEBOUNCE_MS = 150;

const PLAYBACK_MS = 650;

export function useVisualizerRuntime(resolvedInitialData: VisualizerInitialData) {
  const initialKey = `${resolvedInitialData.category}:${resolvedInitialData.selectedAlgo}:${resolvedInitialData.input}`;

  const storeApi = useVisualizerStoreApi();

  const [seededKey, setSeededKey] = useState(initialKey);
  if (seededKey !== initialKey) {
    storeApi.getState().initializeFromServer(resolvedInitialData);
    setSeededKey(initialKey);
  }

  const seededSpecKey = useRef<string | null>(initialKey);
  const seededTraceKey = useRef<string | null>(initialKey);

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

  const playback = useVisualizerStore(
    useShallow((s) => ({ selectedIndex: s.selectedIndex, isPlaying: s.isPlaying })),
  );

  const setSpecHtml = useVisualizerStore((s) => s.setSpecHtml);
  const setIsPlaying = useVisualizerStore((s) => s.setIsPlaying);
  const setSelectedAlgo = useVisualizerStore((s) => s.setSelectedAlgo);
  const setTraceInputRaw = useVisualizerStore((s) => s.setTraceInputRaw);
  const commitTraceInput = useVisualizerStore((s) => s.commitTraceInput);
  const onSelectIndex = useVisualizerStore((s) => s.onSelectIndex);
  const tickPlayback = useVisualizerStore((s) => s.tickPlayback);
  const runNow = useVisualizerStore((s) => s.runNow);
  const setFunctionCatalog = useVisualizerStore((s) => s.setFunctionCatalog);

  useEffect(() => {
    if (
      seededSpecKey.current === initialKey &&
      resolvedInitialData.specHtml &&
      input.selectedAlgo === resolvedInitialData.selectedAlgo
    ) {
      seededSpecKey.current = null;
      return;
    }
    seededSpecKey.current = null;

    fetch(`/api/spec/${encodeURIComponent(input.selectedAlgo)}`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`spec ${r.status}`))))
      .then(setSpecHtml)
      .catch(() => setSpecHtml(""));
  }, [
    initialKey,
    input.selectedAlgo,
    resolvedInitialData.selectedAlgo,
    resolvedInitialData.specHtml,
    setSpecHtml,
  ]);

  useEffect(() => {
    if (
      seededTraceKey.current === initialKey &&
      resolvedInitialData.trace.root &&
      input.selectedAlgo === resolvedInitialData.selectedAlgo &&
      input.traceInputExpression === resolvedInitialData.input &&
      input.traceRequestId === 0
    ) {
      seededTraceKey.current = null;
      return;
    }
    seededTraceKey.current = null;

    const timer = window.setTimeout(runNow, TRACE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [
    initialKey,
    input.selectedAlgo,
    input.traceInputExpression,
    input.traceRequestId,
    resolvedInitialData.input,
    resolvedInitialData.selectedAlgo,
    resolvedInitialData.trace.root,
    runNow,
  ]);

  useEffect(() => {
    if (!playback.isPlaying || trace.flatEntries.length <= 1) return;
    const id = window.setInterval(tickPlayback, PLAYBACK_MS);
    return () => window.clearInterval(id);
  }, [playback.isPlaying, trace.flatEntries.length, tickPlayback]);

  useEffect(() => {
    if (input.functionOptions.length > 0) return;

    fetch("/api/trace/functions")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`functions ${r.status}`))))
      .then((data: Partial<FunctionCatalog>) => {
        if (Array.isArray(data.available_functions) && data.available_functions.length > 0) {
          setFunctionCatalog({
            available_functions: data.available_functions,
            function_meta: data.function_meta ?? {},
          });
        }
      })
      .catch(() => {});
  }, [input.functionOptions.length, setFunctionCatalog]);

  const togglePlay = useCallback(() => {
    const { isPlaying, selectedIndex, flatEntries } = storeApi.getState();
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
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
