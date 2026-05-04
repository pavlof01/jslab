"use client";

import React, { useMemo, useEffect, useRef } from "react";
import { Box, VStack } from "@chakra-ui/react";

import type { TraceStep } from "@/app/abstract-functions-visualizer/spec-runner";
import EntryPointSection from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/EntryPointSection";
import { ExecutionTreeHeader } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/ExecutionTreeHeader";
import { CallBlock } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/TraceTree/CallBlock";
import { buildCallTree } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/TraceTree/treeBuilder";
import { PlaybackDock } from "./PlaybackDock";

type Props = {
  trace: TraceStep[];
  selectedIndex: number;
  selectedAlgo: string;
  onAlgoChange?: (val: string) => void;
  userInputRaw: string;
  onSelectIndex?: (index: number) => void;
  onInputChange?: (val: string) => void;
  onInputCommit?: (val: string) => void;
};

export const ExecutionTreePanel: React.FC<Props> = ({
  trace,
  selectedIndex,
  selectedAlgo,
  onAlgoChange,
  userInputRaw,
  onSelectIndex,
  onInputChange,
  onInputCommit,
}) => {
  const currentCallStack = trace[selectedIndex]?.callStack ?? [];

  const tree = useMemo(() => (trace.length > 0 ? buildCallTree(trace) : null), [trace]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>("[data-active='true']");
    if (!el) return;
    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const relativeTop = elRect.top - containerRect.top;
    const target = container.scrollTop + relativeTop - container.clientHeight / 2 + el.offsetHeight / 2;
    container.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, [selectedIndex]);

  return (
    <Box position="relative" h="full">
      <ExecutionTreeHeader stack={currentCallStack} />

      <Box ref={scrollRef} flex="1" h="full" overflow="auto" pt={28} pb={32} px={{ base: 3, md: 6 }}>
        <VStack align="stretch" gap={0}>
          <EntryPointSection
            onAlgoChange={onAlgoChange}
            selectedAlgo={selectedAlgo}
            userInputRaw={userInputRaw}
            onInputChange={onInputChange}
            onInputCommit={onInputCommit}
          />

          {tree && (
            <CallBlock node={tree} activeIndex={selectedIndex} onSelectIndex={onSelectIndex ?? (() => {})} isRoot />
          )}
        </VStack>
      </Box>
      <PlaybackDock />
    </Box>
  );
};
