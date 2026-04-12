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
import { useTraceState, usePlayback } from "@/app/abstract-functions-visualizer/hooks";
import { EcmaSpecPanel } from "@/app/abstract-functions-visualizer/components/EcmaSpecPanel";
import type { SpecValue } from "@/app/abstract-functions-visualizer/spec-runner";

export function CoercionVisualizer() {
  const [specDrawerOpen, setSpecDrawerOpen] = React.useState(false);

  const { trace, setTrace, setResultValue, setError } = useTraceState();
  const [specHtml, setSpecHtml] = React.useState<string>("");

  const { selectedIndex, isPlaying, setIsPlaying, onSelectIndex, maxIndex } = usePlayback(trace.length);

  const [showSkipped, setShowSkipped] = React.useState(true);
  const [selectedAlgo, setSelectedAlgo] = React.useState("ToNumber");

  const [traceInputRaw, setTraceInputRaw] = React.useState<string>('{ valueOf: () => "1" }');
  const [traceInputExpression, setTraceInputExpression] = React.useState<string>('{ valueOf: () => "1" }');

  const commitTraceInput = React.useCallback((rawInput: string) => {
    setTraceInputExpression(rawInput);
  }, []);

  // Fetch spec HTML when selected algo changes
  React.useEffect(() => {
    fetch(`/api/spec/${selectedAlgo}`)
      .then((r) => r.text())
      .then(setSpecHtml)
      .catch(() => {});
  }, [selectedAlgo]);

  const runNow = React.useCallback(() => {
    setIsPlaying(false);
    setError(null);

    fetch("/api/trace/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ functionName: selectedAlgo, input: traceInputExpression }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(new Error(e?.error ?? `trace-service error ${r.status}`)));
        return r.json();
      })
      .then((data) => {
        if (!data.success) throw new Error(data.error ?? "trace-service returned failure");
        setTrace(data.steps);
        setResultValue(data.result as SpecValue);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Unknown executor error";
        setError(msg);
        setTrace([]);
        setResultValue(undefined);
      });
  }, [selectedAlgo, traceInputExpression, setIsPlaying, setError, setTrace, setResultValue]);

  React.useEffect(() => {
    const t = window.setTimeout(() => runNow(), 150);
    return () => window.clearTimeout(t);
  }, [runNow]);

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

      <Box bg="#0a0a0a" minH="92vh" overflow="hidden">
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

          <Box position="relative" minH={0} h="100%">
            <ExecutionTreePanel
              trace={trace}
              selectedIndex={selectedIndex}
              entryLabel={selectedAlgo}
              onAlgoChange={(v) => setSelectedAlgo(v)}
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
