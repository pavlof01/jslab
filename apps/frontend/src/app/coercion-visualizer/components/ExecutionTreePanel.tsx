"use client";

import * as React from "react";
import { Box, VStack } from "@chakra-ui/react";

import type { Algorithm, TraceStep } from "@/app/coercion-visualizer/spec-runner";
import type { TraceFrame } from "@/app/coercion-visualizer/traceModel";
import { BranchNode } from "@/app/coercion-visualizer/components/ExecutionTreePanel/BranchNode";
import { EntryPointSection } from "@/app/coercion-visualizer/components/ExecutionTreePanel/EntryPointSection";
import { ExecutionTreeHeader } from "@/app/coercion-visualizer/components/ExecutionTreePanel/ExecutionTreeHeader";
import { TraceStepNode } from "@/app/coercion-visualizer/components/ExecutionTreePanel/TraceStepNode";
import { getDepthForStep } from "@/app/coercion-visualizer/components/ExecutionTreePanel/executionTreeUtils";

export function ExecutionTreePanel({
  trace,
  selectedIndex,
  framesByStep,
  algoById,
  entryLabel,
  onSelectIndex,
}: {
  trace: TraceStep[];
  selectedIndex: number;
  framesByStep: TraceFrame[][];
  algoById: Map<string, Algorithm>;
  entryLabel: string;
  onSelectIndex?: (index: number) => void;
}) {
  const nodes = React.useMemo(() => {
    const out: Array<{ step: TraceStep; index: number }> = [];
    const max = Math.min(trace.length - 1, selectedIndex);
    if (max < 0) return out;

    for (let i = 0; i <= max; i++) {
      const step = trace[i];
      if (i === 0 && step.kind === "call") continue; // rendered as Entry Point
      if (step.kind === "ret") continue;
      out.push({ step, index: i });
    }
    return out;
  }, [selectedIndex, trace]);

  const currentStack = framesByStep[selectedIndex] ?? [];
  const depth = Math.max(0, currentStack.length);

  return (
    <Box position="relative" h="full">
      <ExecutionTreeHeader depth={depth} />

      <Box
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
            <EntryPointSection entryLabel={entryLabel} hasNodes={nodes.length > 0} />

            {nodes.map(({ step, index }, idx) => {
              const stack = framesByStep[index];
              const prevStack = index > 0 ? framesByStep[index - 1] : undefined;
              const nodeDepth = getDepthForStep(step, stack, prevStack);
              const isActive = index === selectedIndex;
              if (step.kind === "if") {
                return (
                  <BranchNode
                    key={`${index}:${step.kind}`}
                    step={step}
                    index={index}
                    showConnector={idx !== 0}
                    nodeDepth={nodeDepth}
                    isActive={isActive}
                    algoById={algoById}
                    onSelectIndex={onSelectIndex}
                  />
                );
              }

              if (step.kind === "call" || step.kind === "let" || step.kind === "return") {
                return (
                  <TraceStepNode
                    key={`${index}:${step.kind}`}
                    step={step}
                    index={index}
                    showConnector={idx !== 0}
                    nodeDepth={nodeDepth}
                    isActive={isActive}
                    onSelectIndex={onSelectIndex}
                  />
                );
              }

              return null;
            })}
          </VStack>
        </Box>
      </Box>
    </Box>
  );
}
