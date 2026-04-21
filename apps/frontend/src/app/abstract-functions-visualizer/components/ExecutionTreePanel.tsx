"use client";

import * as React from "react";
import { Box, VStack } from "@chakra-ui/react";

import type { TraceStep } from "@/app/abstract-functions-visualizer/spec-runner";
import EntryPointSection from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/EntryPointSection";
import { ExecutionTreeHeader } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/ExecutionTreeHeader";
import { TraceStepNode } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/TraceStepNode";
import { PlaybackDock } from "./PlaybackDock";
import { useVisualizerStore } from "@/app/abstract-functions-visualizer/store";

type Props = {
  trace: TraceStep[];
  selectedIndex: number;
  entryLabel: string;
  onAlgoChange?: (val: string) => void;
  userInputRaw: string;
  onSelectIndex?: (index: number) => void;
  onInputChange?: (val: string) => void;
  onInputCommit?: (val: string) => void;
};

export const ExecutionTreePanel: React.FC<Props> = ({
  trace,
  selectedIndex,
  entryLabel,
  onAlgoChange,
  userInputRaw,
  onSelectIndex,
  onInputChange,
  onInputCommit,
}) => {
  const showSkipped = useVisualizerStore((s) => s.showSkipped);
  const steps = showSkipped
    ? trace.map((step, index) => ({ step, index }))
    : trace.map((step, index) => ({ step, index })).filter(({ step }) => !(step.kind === "if" && step.isSkipped));

  const currentCallStack = trace[selectedIndex]?.callStack ?? [];

  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
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

      <Box
        ref={scrollRef}
        flex="1"
        h="full"
        overflow="auto"
        pt={28}
        pb={32}
        px={{ base: 4, md: 10 }}
        bgImage="radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)"
        bgSize="20px 20px"
      >
        <Box maxW="4xl" mx="auto">
          <VStack align="stretch" gap={0}>
            <EntryPointSection
              entryLabel={entryLabel}
              onAlgoChange={onAlgoChange}
              userInputRaw={userInputRaw}
              hasNodes={trace.length > 0}
              onInputChange={onInputChange}
              onInputCommit={onInputCommit}
            />

            {steps.map(({ step, index }, idx) => (
              <TraceStepNode
                key={step.stepId}
                step={step}
                index={index}
                showConnector={idx !== 0}
                nodeDepth={step.depth}
                isActive={index === selectedIndex}
                onSelectIndex={onSelectIndex}
              />
            ))}
          </VStack>
        </Box>
      </Box>
      <PlaybackDock />
    </Box>
  );
};
