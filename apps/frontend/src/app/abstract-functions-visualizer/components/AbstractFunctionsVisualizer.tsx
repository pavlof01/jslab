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
import { EcmaSpecPanel } from "@/app/abstract-functions-visualizer/components/EcmaSpecPanel";
import { useVisualizerStore } from "@/app/abstract-functions-visualizer/store";

export function AbstractFunctionsVisualizer() {
  const trace = useVisualizerStore((s) => s.trace);
  const selectedIndex = useVisualizerStore((s) => s.selectedIndex);
  const isPlaying = useVisualizerStore((s) => s.isPlaying);
  const specHtml = useVisualizerStore((s) => s.specHtml);
  const setSpecHtml = useVisualizerStore((s) => s.setSpecHtml);
  const specDrawerOpen = useVisualizerStore((s) => s.specDrawerOpen);
  const setSpecDrawerOpen = useVisualizerStore((s) => s.setSpecDrawerOpen);
  const selectedAlgo = useVisualizerStore((s) => s.selectedAlgo);
  const setSelectedAlgo = useVisualizerStore((s) => s.setSelectedAlgo);
  const traceInputRaw = useVisualizerStore((s) => s.traceInputRaw);
  const setTraceInputRaw = useVisualizerStore((s) => s.setTraceInputRaw);
  const traceInputExpression = useVisualizerStore((s) => s.traceInputExpression);
  const commitTraceInput = useVisualizerStore((s) => s.commitTraceInput);
  const onSelectIndex = useVisualizerStore((s) => s.onSelectIndex);
  const tickPlayback = useVisualizerStore((s) => s.tickPlayback);
  const runNow = useVisualizerStore((s) => s.runNow);

  // Fetch spec HTML when selected algo changes
  React.useEffect(() => {
    fetch(`/api/spec/${selectedAlgo}`)
      .then((r) => r.text())
      .then(setSpecHtml)
      .catch(() => {});
  }, [selectedAlgo, setSpecHtml]);

  // Re-run trace when input or algo changes (debounced)
  React.useEffect(() => {
    const t = window.setTimeout(() => runNow(), 150);
    return () => window.clearTimeout(t);
  }, [selectedAlgo, traceInputExpression, runNow]);

  // Playback interval
  React.useEffect(() => {
    if (!isPlaying || trace.length <= 1) return;
    const id = window.setInterval(tickPlayback, 650);
    return () => window.clearInterval(id);
  }, [isPlaying, trace.length, tickPlayback]);

  return (
    <>
      {/* Mobile FAB — rendered outside overflow:hidden container so fixed positioning works correctly */}
      <Box display={{ base: "flex", lg: "none" }} position="fixed" top={100} right={6} zIndex={40}>
        <IconButton
          aria-label="Open ECMA spec"
          size="sm"
          variant="outline"
          bg="overlay.100"
          backdropFilter="blur(8px)"
          borderColor="rgba(255,255,255,0.12)"
          onClick={() => setSpecDrawerOpen(true)}
        >
          <LuBookOpen />
        </IconButton>
      </Box>

      <Box bg="background.300" minH="92vh" overflow="hidden">
        {/* Mobile drawer for spec panel */}
        <Box display={{ base: "flex", lg: "none" }}>
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
        </Box>

        <Grid templateColumns={{ base: "1fr", lg: "360px 1fr" }} h={{ base: "auto", lg: "92vh" }} overflow="hidden">
          {/* Desktop: spec panel in grid */}
          <Box minH={0} overflow="hidden" display={{ base: "none", lg: "block" }}>
            <EcmaSpecPanel trace={trace} selectedIndex={selectedIndex} specHtml={specHtml} />
          </Box>

          <Box position="relative" minH={0} h="100%">
            <ExecutionTreePanel
              trace={trace}
              selectedIndex={selectedIndex}
              entryLabel={selectedAlgo}
              onAlgoChange={setSelectedAlgo}
              userInputRaw={traceInputRaw}
              onSelectIndex={onSelectIndex}
              onInputChange={setTraceInputRaw}
              onInputCommit={commitTraceInput}
            />
          </Box>
        </Grid>
      </Box>
    </>
  );
}
