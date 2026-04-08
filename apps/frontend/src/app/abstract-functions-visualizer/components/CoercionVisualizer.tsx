"use client";

import * as React from "react";
import {
  Box,
  Grid,
  IconButton,
  DrawerRoot,
  DrawerBackdrop,
  DrawerPositioner,
  DrawerContent,
  DrawerBody,
  DrawerCloseTrigger,
} from "@chakra-ui/react";
import { LuBookOpen, LuX } from "react-icons/lu";

import { ExecutionTreePanel } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel";
import { PlaybackDock } from "@/app/abstract-functions-visualizer/components/PlaybackDock";
import { useColorModeValue } from "@/components/ui/color-mode";
import { buildTraceModel } from "@/app/abstract-functions-visualizer/traceModel";
import { traceResultToTraceSteps } from "@/app/abstract-functions-visualizer/adapters/executor-to-trace-adapter";
import { useAlgorithmCatalog, useTraceState, usePlayback } from "@/app/abstract-functions-visualizer/hooks";
import { executeAlgorithmTrace } from "@/app/abstract-functions-visualizer/components/CoercionVisualizer.executors";
import { EcmaSpecPanel } from "@/app/abstract-functions-visualizer/components/EcmaSpecPanel";

export function CoercionVisualizer() {
  const [specDrawerOpen, setSpecDrawerOpen] = React.useState(false);
  const { algoById } = useAlgorithmCatalog();

  const { trace, setTrace, setResultValue, setError } = useTraceState();
  const [specHtml, setSpecHtml] = React.useState<string>("");

  const { selectedIndex, isPlaying, setIsPlaying, onSelectIndex, maxIndex } = usePlayback(trace.length);

  const [showSkipped, setShowSkipped] = React.useState(true);

  const [traceInputRaw, setTraceInputRaw] = React.useState<string>('{ valueOf: () => "1" }');
  const [traceInputExpression, setTraceInputExpression] = React.useState<string>('{ valueOf: () => "1" }');

  const commitTraceInput = React.useCallback((rawInput: string) => {
    setTraceInputExpression(rawInput);
  }, []);

  // Fetch spec HTML once — it only depends on the function name, not the input
  React.useEffect(() => {
    fetch("/api/spec/ToNumber")
      .then((r) => r.text())
      .then(setSpecHtml)
      .catch(() => {});
  }, []);

  const runNow = React.useCallback(() => {
    setIsPlaying(false);
    setError(null);

    executeAlgorithmTrace("ToNumber", traceInputExpression)
      .then(({ traceResult, resultValue: result }) => {
        const traceSteps = traceResultToTraceSteps(traceResult);
        setTrace(traceSteps);
        setResultValue(result);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Unknown executor error";
        setError(msg);
        setTrace([]);
        setResultValue(undefined);
      });
  }, [traceInputExpression, setIsPlaying, setError, setTrace, setResultValue]);

  React.useEffect(() => {
    const t = window.setTimeout(() => runNow(), 150);
    return () => window.clearTimeout(t);
  }, [runNow]);

  const traceModel = React.useMemo(
    () =>
      buildTraceModel(trace, {
        getAlgoParams: (algoId) => algoById.get(algoId)?.params,
        getAlgoLocals: (algoId) => algoById.get(algoId)?.locals,
      }),
    [algoById, trace],
  );

  const pageBg = useColorModeValue("#f8f8f5", "#0a0a0a");

  return (
    <>
      {/* Mobile FAB — rendered outside overflow:hidden container so fixed positioning works correctly */}
      <Box display={{ base: "flex", lg: "none" }} position="fixed" top={3} right={3} zIndex={40}>
        <IconButton
          aria-label="Open ECMA spec"
          size="sm"
          variant="outline"
          bg="rgba(20,20,20,0.85)"
          backdropFilter="blur(8px)"
          borderColor="rgba(255,255,255,0.12)"
          onClick={() => setSpecDrawerOpen(true)}
        >
          <LuBookOpen />
        </IconButton>
      </Box>

      <Box bg={pageBg} minH="92vh" overflow="hidden">
        {/* Mobile drawer for spec panel */}
        <DrawerRoot open={specDrawerOpen} onOpenChange={(e) => setSpecDrawerOpen(e.open)} placement="start" size="xs">
          <DrawerBackdrop />
          <DrawerPositioner>
            <DrawerContent>
              <DrawerBody p={0} display="flex" flexDir="column" h="100%">
                <Box display="flex" justifyContent="flex-end" p={2}>
                  <DrawerCloseTrigger asChild>
                    <IconButton aria-label="Close spec panel" size="sm" variant="ghost">
                      <LuX />
                    </IconButton>
                  </DrawerCloseTrigger>
                </Box>
                <Box flex={1} minH={0} overflow="hidden">
                  <EcmaSpecPanel trace={trace} selectedIndex={selectedIndex} specHtml={specHtml} />
                </Box>
              </DrawerBody>
            </DrawerContent>
          </DrawerPositioner>
        </DrawerRoot>

        <Grid templateColumns={{ base: "1fr", lg: "360px 1fr" }} h={{ base: "auto", lg: "92vh" }} overflow="hidden">
          {/* Desktop: spec panel in grid */}
          <Box minH={0} overflow="hidden" display={{ base: "none", lg: "block" }}>
            <EcmaSpecPanel trace={trace} selectedIndex={selectedIndex} specHtml={specHtml} />
          </Box>

          <Box position="relative" minH={0} overflow="hidden">
            <ExecutionTreePanel
              trace={trace}
              selectedIndex={selectedIndex}
              framesByStep={traceModel.framesByStep}
              algoById={algoById}
              entryLabel="ToNumber"
              userInputRaw={traceInputRaw}
              onSelectIndex={onSelectIndex}
              showSkipped={showSkipped}
              onInputChange={setTraceInputRaw}
              onInputCommit={commitTraceInput}
            />
            <PlaybackDock
              selectedIndex={selectedIndex}
              maxIndex={maxIndex}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying((v: boolean) => !v)}
              onSelectIndex={onSelectIndex}
              showSkipped={showSkipped}
              onToggleSkipped={() => setShowSkipped((v) => !v)}
            />
          </Box>
        </Grid>
      </Box>
    </>
  );
}
