"use client";

import * as React from "react";
import { Box, Grid } from "@chakra-ui/react";

import { ExplorerSidebar } from "@/app/coercion-visualizer/components/ExplorerSidebar";
import { ExecutionTreePanel } from "@/app/coercion-visualizer/components/ExecutionTreePanel";
import { PlaybackDock } from "@/app/coercion-visualizer/components/PlaybackDock";
import { RightPanel } from "@/app/coercion-visualizer/components/RightPanel";
import { useColorModeValue } from "@/components/ui/color-mode";
import { buildTraceModel } from "@/app/coercion-visualizer/traceModel";
import { traceResultToTraceSteps } from "@/app/coercion-visualizer/adapters/executor-to-trace-adapter";
import { parseUserInput } from "@/app/coercion-visualizer/utils/parseUserInput";
import { useAlgorithmCatalog, useTraceState, usePlayback } from "@/app/coercion-visualizer/hooks";
import { executeAlgorithmTrace } from "@/app/coercion-visualizer/components/CoercionVisualizer.executors";

export function CoercionVisualizer() {
  // Catalog and algorithms
  const { algoById } = useAlgorithmCatalog();

  // Trace and execution state
  const { trace, setTrace, resultValue, setResultValue, error, setError, currentTraceResult, setCurrentTraceResult } =
    useTraceState();

  // Playback state
  const { selectedIndex, isPlaying, setIsPlaying, onSelectIndex, maxIndex } = usePlayback(trace.length);

  // ToNumber input state - separate raw text from parsed value
  const [traceInputRaw, setTraceInputRaw] = React.useState<string>('{ valueOf: () => "1" }');
  const [traceInput, setTraceInput] = React.useState<unknown>('{ valueOf: () => "1" }');

  // Handler to parse and commit raw input
  const commitTraceInput = React.useCallback((rawInput: string) => {
    const parsed = parseUserInput(rawInput);
    setTraceInput(parsed.value);
  }, []);

  // Execution
  const runNow = React.useCallback(() => {
    setIsPlaying(false);
    try {
      setError(null);
      setCurrentTraceResult(null);

      const { traceResult, resultValue: result } = executeAlgorithmTrace(traceInput);
      const traceSteps = traceResultToTraceSteps(traceResult);
      setTrace(traceSteps);
      setCurrentTraceResult(traceResult);
      setResultValue(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown executor error";
      setError(msg);
      setTrace([]);
      setResultValue(undefined);
      setCurrentTraceResult(null);
    }
  }, [traceInput, setIsPlaying, setError, setCurrentTraceResult, setTrace, setResultValue]);

  React.useEffect(() => {
    const t = window.setTimeout(() => runNow(), 150);
    return () => window.clearTimeout(t);
  }, [runNow]);

  // Trace model and step navigation
  const traceModel = React.useMemo(
    () =>
      buildTraceModel(trace, {
        getAlgoParams: (algoId) => algoById.get(algoId)?.params,
        getAlgoLocals: (algoId) => algoById.get(algoId)?.locals,
      }),
    [algoById, trace],
  );

  const currentFrames = traceModel.framesByStep[selectedIndex] ?? [];

  // Colors
  const pageBg = useColorModeValue("#f8f8f5", "#0a0a0a");
  const panelBg = useColorModeValue("#ffffff", "rgba(20,20,20,0.30)");
  const panelBorder = useColorModeValue("#e2e8f0", "#262626");
  const softSurfaceBgStrong = useColorModeValue("rgba(255,255,255,0.80)", "rgba(0,0,0,0.18)");

  return (
    <Box bg={pageBg} minH="92vh" overflow="hidden">
      <Grid templateColumns={{ base: "1fr", lg: "320px 1fr 420px" }} h={{ base: "auto", lg: "92vh" }} overflow="hidden">
        <ExplorerSidebar
          error={error}
          resultValue={resultValue}
          traceLength={trace.length}
          currentFrames={currentFrames}
          algoById={algoById}
          panelBg={panelBg}
          panelBorder={panelBorder}
          softSurfaceBgStrong={softSurfaceBgStrong}
          traceInputRaw={traceInputRaw}
          onTraceInputRawChange={setTraceInputRaw}
          onTraceInputCommit={commitTraceInput}
        />

        <Box position="relative" minH={0} overflow="hidden">
          <ExecutionTreePanel
            trace={trace}
            selectedIndex={selectedIndex}
            framesByStep={traceModel.framesByStep}
            algoById={algoById}
            entryLabel="ToNumber"
            userInputRaw={traceInputRaw}
            onSelectIndex={onSelectIndex}
          />
          <PlaybackDock
            selectedIndex={selectedIndex}
            maxIndex={maxIndex}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((v: boolean) => !v)}
            onSelectIndex={onSelectIndex}
          />
        </Box>

        <RightPanel
          currentTraceResult={currentTraceResult}
          selectedIndex={selectedIndex}
          onSelectIndex={onSelectIndex}
          algoById={algoById}
        />
      </Grid>
    </Box>
  );
}
