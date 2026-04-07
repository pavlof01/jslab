"use client";

import * as React from "react";
import { Box, VStack } from "@chakra-ui/react";

import type { Algorithm, TraceStep } from "@/app/abstract-functions-visualizer/spec-runner";
import type { TraceFrame } from "@/app/abstract-functions-visualizer/traceModel";
import { BranchNode } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/BranchNode";
import { EntryPointSection } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/EntryPointSection";
import { ExecutionTreeHeader } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/ExecutionTreeHeader";
import {
  KeyEventAnnotation,
  type KeyEventType,
} from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/KeyEventAnnotation";
import { TraceStepNode } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/TraceStepNode";
import { getDepthForStep } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/executionTreeUtils";

export function ExecutionTreePanel({
  trace,
  selectedIndex,
  framesByStep,
  algoById,
  entryLabel,
  userInputRaw,
  onSelectIndex,
  showSkipped = false,
  onInputChange,
  onInputCommit,
}: {
  trace: TraceStep[];
  selectedIndex: number;
  framesByStep: TraceFrame[][];
  algoById: Map<string, Algorithm>;
  entryLabel: string;
  userInputRaw: string;
  onSelectIndex?: (index: number) => void;
  showSkipped?: boolean;
  onInputChange?: (val: string) => void;
  onInputCommit?: (val: string) => void;
}) {
  const nodes = React.useMemo(() => {
    const out: Array<{ step: TraceStep; index: number }> = [];
    const max = Math.min(trace.length - 1, selectedIndex);
    if (max < 0) return out;

    for (let i = 0; i <= max; i++) {
      const step = trace[i];
      if (i === 0 && step.kind === "call") continue; // rendered as Entry Point
      if (step.kind === "ret") continue;
      // Hide skipped steps (if-else not taken) when showSkipped is false
      if (!showSkipped && step.kind === "if" && (step as Extract<TraceStep, { kind: "if" }>).decision?.taken === "else") continue;
      out.push({ step, index: i });
    }
    return out;
  }, [selectedIndex, trace, showSkipped]);

  const currentStack = framesByStep[selectedIndex] ?? [];

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = scrollRef.current?.querySelector<HTMLElement>("[data-active='true']");
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedIndex]);

  // Helper to detect key events in steps
  function getKeyEvent(step: TraceStep): { type: KeyEventType; text: string } | null {
    if (step.kind === "let" && step.hint) {
      // Assertion statements
      if (step.hint.startsWith("Assert:")) {
        return { type: "assert", text: step.hint };
      }
      // Method calls (toPrimitive, toString, valueOf, etc.)
      if (
        step.hint.includes("toPrimitive") ||
        step.hint.includes("toString") ||
        step.hint.includes("valueOf") ||
        step.hint.includes("[Symbol.")
      ) {
        return { type: "methodCall", text: step.hint };
      }
      // Type conversions - look for patterns like "Object → Primitive" or "String to Number"
      if (
        step.hint.includes(" → ") ||
        step.hint.includes("to Number") ||
        step.hint.includes("to String") ||
        step.hint.includes("to Primitive") ||
        step.hint.includes("to Boolean")
      ) {
        return { type: "typeConversion", text: step.hint };
      }
    }
    return null;
  }

  return (
    <Box position="relative" h="full">
      <ExecutionTreeHeader stack={currentStack} />

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
              userInputRaw={userInputRaw}
              hasNodes={nodes.length > 0}
              onInputChange={onInputChange}
              onInputCommit={onInputCommit}
            />

            {nodes.map(({ step, index }, idx) => {
              const stack = framesByStep[index];
              const prevStack = index > 0 ? framesByStep[index - 1] : undefined;
              const nodeDepth = getDepthForStep(step, stack, prevStack);
              const isActive = index === selectedIndex;

              const keyEvent = getKeyEvent(step);

              const renderStep = () => {
                if (step.kind === "if") {
                  return (
                    <BranchNode
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
              };

              // Render key event annotation if this step has one
              if (keyEvent) {
                return (
                  <Box key={`${index}:${step.kind}:withAnnotation`} data-active={isActive || undefined}>
                    <KeyEventAnnotation text={keyEvent.text} type={keyEvent.type} nodeDepth={nodeDepth} />
                    {renderStep()}
                  </Box>
                );
              }

              return (
                <Box key={`${index}:${step.kind}`} data-active={isActive || undefined}>
                  {renderStep()}
                </Box>
              );
            })}
          </VStack>
        </Box>
      </Box>
    </Box>
  );
}
