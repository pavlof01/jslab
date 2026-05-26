"use client";

import { useEffect } from "react";
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
import { useVisualizerStore, type AlgoCategory } from "@/app/abstract-functions-visualizer/store";

export function AbstractFunctionsVisualizer({
  initialCategory = "typeConversion",
}: {
  initialCategory?: AlgoCategory;
}) {
  const root = useVisualizerStore((s) => s.root);
  const flatEntries = useVisualizerStore((s) => s.flatEntries);
  const selectedIndex = useVisualizerStore((s) => s.selectedIndex);
  const isPlaying = useVisualizerStore((s) => s.isPlaying);
  const specHtml = useVisualizerStore((s) => s.specHtml);
  const setSpecHtml = useVisualizerStore((s) => s.setSpecHtml);
  const specDrawerOpen = useVisualizerStore((s) => s.specDrawerOpen);
  const setSpecDrawerOpen = useVisualizerStore((s) => s.setSpecDrawerOpen);
  const category = useVisualizerStore((s) => s.category);
  const setCategory = useVisualizerStore((s) => s.setCategory);
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

  // Sync the active tab to the requested category
  useEffect(() => {
    if (useVisualizerStore.getState().category !== initialCategory) {
      setCategory(initialCategory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch spec HTML when selected algo changes
  useEffect(() => {
    fetch(`/api/spec/${selectedAlgo}`)
      .then((r) => r.text())
      .then(setSpecHtml)
      .catch(() => {});
  }, [selectedAlgo, setSpecHtml]);

  // Re-run trace when input or algo changes (debounced)
  useEffect(() => {
    const t = window.setTimeout(() => runNow(), 150);
    return () => window.clearTimeout(t);
  }, [selectedAlgo, traceInputExpression, runNow]);

  // Playback interval
  useEffect(() => {
    if (!isPlaying || flatEntries.length <= 1) return;
    const id = window.setInterval(tickPlayback, 650);
    return () => window.clearInterval(id);
  }, [isPlaying, flatEntries.length, tickPlayback]);

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

      <Box bg="background.300" h="calc(100dvh - var(--header-h))" overflow="hidden">
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
                    <EcmaSpecPanel flatEntries={flatEntries} selectedIndex={selectedIndex} specHtml={specHtml} />
                  </Box>
                </DrawerBody>
              </DrawerContent>
            </DrawerPositioner>
          </DrawerRoot>
        </Box>

        <Grid templateColumns={{ base: "1fr", lg: "360px 1fr" }} h="full" overflow="hidden">
          {/* Desktop: spec panel in grid */}
          <Box minH={0} overflow="hidden" display={{ base: "none", lg: "block" }}>
            <EcmaSpecPanel flatEntries={flatEntries} selectedIndex={selectedIndex} specHtml={specHtml} />
          </Box>

          <Box position="relative" minH={0} h="100%">
            <ExecutionTreePanel
              root={root}
              flatEntries={flatEntries}
              selectedIndex={selectedIndex}
              category={category}
              selectedAlgo={selectedAlgo}
              detectedOperator={detectedOperator}
              effectiveAlgoId={effectiveAlgoId}
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
