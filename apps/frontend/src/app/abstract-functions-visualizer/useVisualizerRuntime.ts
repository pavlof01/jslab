"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { flattenTrace } from "@/app/abstract-functions-visualizer/flatten";
import { DEFAULTS_BY_CATEGORY, EMPTY_FUNCTION_CATALOG, type AlgoCategory, type VisualizerInitialData } from "./model";
import { useVisualizerStore } from "./store";

function createFallbackInitialData(category: AlgoCategory): VisualizerInitialData {
  const defaults = DEFAULTS_BY_CATEGORY[category];

  return {
    category,
    selectedAlgo: defaults.algo,
    input: defaults.input,
    specHtml: "",
    trace: {
      root: null,
      result: undefined,
      effectiveAlgoId: null,
      detectedOperator: null,
      error: null,
    },
    functionCatalog: EMPTY_FUNCTION_CATALOG,
  };
}

export function useVisualizerRuntime(initialCategory: AlgoCategory, initialData?: VisualizerInitialData) {
  const resolvedInitialData = useMemo(
    () => initialData ?? createFallbackInitialData(initialCategory),
    [initialCategory, initialData],
  );
  const initialKey = `${resolvedInitialData.category}:${resolvedInitialData.selectedAlgo}:${resolvedInitialData.input}`;

  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const clientReady = hydratedKey === initialKey;
  const initialSpecKeyRef = useRef<string | null>(initialKey);
  const initialTraceKeyRef = useRef<string | null>(initialKey);

  const root = useVisualizerStore((s) => s.root);
  const flatEntries = useVisualizerStore((s) => s.flatEntries);
  const selectedIndex = useVisualizerStore((s) => s.selectedIndex);
  const isPlaying = useVisualizerStore((s) => s.isPlaying);
  const specHtml = useVisualizerStore((s) => s.specHtml);
  const setSpecHtml = useVisualizerStore((s) => s.setSpecHtml);
  const specDrawerOpen = useVisualizerStore((s) => s.specDrawerOpen);
  const setSpecDrawerOpen = useVisualizerStore((s) => s.setSpecDrawerOpen);
  const category = useVisualizerStore((s) => s.category);
  const selectedAlgo = useVisualizerStore((s) => s.selectedAlgo);
  const setSelectedAlgo = useVisualizerStore((s) => s.setSelectedAlgo);
  const detectedOperator = useVisualizerStore((s) => s.detectedOperator);
  const effectiveAlgoId = useVisualizerStore((s) => s.effectiveAlgoId);
  const traceInputRaw = useVisualizerStore((s) => s.traceInputRaw);
  const setTraceInputRaw = useVisualizerStore((s) => s.setTraceInputRaw);
  const traceInputExpression = useVisualizerStore((s) => s.traceInputExpression);
  const commitTraceInput = useVisualizerStore((s) => s.commitTraceInput);
  const onSelectIndex = useVisualizerStore((s) => s.onSelectIndex);
  const tickPlayback = useVisualizerStore((s) => s.tickPlayback);
  const runNow = useVisualizerStore((s) => s.runNow);
  const initializeFromServer = useVisualizerStore((s) => s.initializeFromServer);
  const functionOptions = useVisualizerStore((s) => s.functionOptions);
  const functionMeta = useVisualizerStore((s) => s.functionMeta);
  const setFunctionCatalog = useVisualizerStore((s) => s.setFunctionCatalog);

  const initialFlatEntries = useMemo(() => {
    const initialRoot = resolvedInitialData.trace.root;
    return initialRoot ? flattenTrace(initialRoot) : [];
  }, [resolvedInitialData.trace.root]);

  useEffect(() => {
    initialSpecKeyRef.current = initialKey;
    initialTraceKeyRef.current = initialKey;
    initializeFromServer(resolvedInitialData);
    setHydratedKey(initialKey);
  }, [initialKey, initializeFromServer, resolvedInitialData]);

  useEffect(() => {
    if (!clientReady) return;

    if (
      initialSpecKeyRef.current === initialKey &&
      resolvedInitialData.specHtml &&
      selectedAlgo === resolvedInitialData.selectedAlgo
    ) {
      initialSpecKeyRef.current = null;
      return;
    }

    initialSpecKeyRef.current = null;

    fetch(`/api/spec/${selectedAlgo}`)
      .then((r) => r.text())
      .then(setSpecHtml)
      .catch(() => {});
  }, [clientReady, initialKey, resolvedInitialData.selectedAlgo, resolvedInitialData.specHtml, selectedAlgo, setSpecHtml]);

  useEffect(() => {
    if (!clientReady) return;

    if (
      initialTraceKeyRef.current === initialKey &&
      resolvedInitialData.trace.root &&
      selectedAlgo === resolvedInitialData.selectedAlgo &&
      traceInputExpression === resolvedInitialData.input
    ) {
      initialTraceKeyRef.current = null;
      return;
    }

    initialTraceKeyRef.current = null;

    const t = window.setTimeout(() => runNow(), 150);
    return () => window.clearTimeout(t);
  }, [
    clientReady,
    initialKey,
    resolvedInitialData.input,
    resolvedInitialData.selectedAlgo,
    resolvedInitialData.trace.root,
    runNow,
    selectedAlgo,
    traceInputExpression,
  ]);

  useEffect(() => {
    if (!clientReady || !isPlaying || flatEntries.length <= 1) return;
    const id = window.setInterval(tickPlayback, 650);
    return () => window.clearInterval(id);
  }, [clientReady, isPlaying, flatEntries.length, tickPlayback]);

  // Fallback: SSR couldn't reach trace-service, so the catalog came back empty. Fetch it client-side.
  useEffect(() => {
    if (!clientReady || functionOptions.length > 0) return;

    fetch("/api/trace/functions")
      .then((r) => r.json())
      .then((data: { available_functions?: string[]; function_meta?: typeof functionMeta }) => {
        if (Array.isArray(data.available_functions) && data.available_functions.length > 0) {
          setFunctionCatalog({
            available_functions: data.available_functions,
            function_meta: data.function_meta ?? {},
          });
        }
      })
      .catch(() => {});
  }, [clientReady, functionOptions.length, functionMeta, setFunctionCatalog]);

  return {
    root: clientReady ? root : resolvedInitialData.trace.root,
    flatEntries: clientReady ? flatEntries : initialFlatEntries,
    selectedIndex: clientReady ? selectedIndex : 0,
    specHtml: clientReady ? specHtml : resolvedInitialData.specHtml,
    specDrawerOpen,
    setSpecDrawerOpen,
    category: clientReady ? category : resolvedInitialData.category,
    selectedAlgo: clientReady ? selectedAlgo : resolvedInitialData.selectedAlgo,
    detectedOperator: clientReady ? detectedOperator : resolvedInitialData.trace.detectedOperator,
    effectiveAlgoId: clientReady ? effectiveAlgoId : resolvedInitialData.trace.effectiveAlgoId,
    traceInputRaw: clientReady ? traceInputRaw : resolvedInitialData.input,
    setSelectedAlgo,
    setTraceInputRaw,
    commitTraceInput,
    onSelectIndex,
    functionOptions: clientReady ? functionOptions : resolvedInitialData.functionCatalog.available_functions,
    functionMeta: clientReady ? functionMeta : resolvedInitialData.functionCatalog.function_meta,
  };
}
