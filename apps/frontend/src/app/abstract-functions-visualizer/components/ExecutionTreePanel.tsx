"use client";

import * as React from "react";
import { Box, VStack } from "@chakra-ui/react";

import type { TraceStep } from "@/app/abstract-functions-visualizer/spec-runner";
import { BranchNode } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/BranchNode";
import EntryPointSection from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/EntryPointSection";
import { ExecutionTreeHeader } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/ExecutionTreeHeader";
import {
  KeyEventAnnotation,
  type KeyEventType,
} from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/KeyEventAnnotation";
import { TraceStepNode } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/TraceStepNode";

type Props = {
  trace: TraceStep[];
  selectedIndex: number;
  entryLabel: string;
  algoOptions?: string[];
  onAlgoChange?: (val: string) => void;
  userInputRaw: string;
  onSelectIndex?: (index: number) => void;
  showSkipped?: boolean;
  onInputChange?: (val: string) => void;
  onInputCommit?: (val: string) => void;
};

export const ExecutionTreePanel: React.FC<Props> = ({
  trace,
  selectedIndex,
  entryLabel,
  algoOptions,
  onAlgoChange,
  userInputRaw,
  onSelectIndex,
  showSkipped = false,
  onInputChange,
  onInputCommit,
}) => {
  const nodes = React.useMemo(() => {
    type NodeEntry = {
      step: TraceStep;
      index: number;
      callStep?: Extract<TraceStep, { kind: "call" }>;
      callIndex?: number;
    };
    const out: NodeEntry[] = [];
    const max = Math.min(trace.length - 1, selectedIndex);
    if (max < 0) return out;

    let i = 0;
    while (i <= max) {
      const step = trace[i];
      if (i === 0 && step.kind === "call") {
        i++;
        continue;
      } // rendered as Entry Point
      if (step.kind === "ret") {
        i++;
        continue;
      }
      // All if-steps are skipped branches — hide them when showSkipped is false
      if (!showSkipped && step.kind === "if") {
        i++;
        continue;
      }

      // Merge a "let" step with the immediately following "call" step only when
      // the service explicitly marked it as a variable-binding call (varName present).
      const next = i + 1 <= max ? trace[i + 1] : undefined;
      const letVarName = step.kind === "let" ? (step as Extract<TraceStep, { kind: "let" }>).varName : undefined;
      if (step.kind === "let" && letVarName && next?.kind === "call") {
        out.push({ step, index: i, callStep: next as Extract<TraceStep, { kind: "call" }>, callIndex: i + 1 });
        i += 2;
      } else {
        out.push({ step, index: i });
        i++;
      }
    }
    return out;
  }, [selectedIndex, trace, showSkipped]);

  const currentCallStack = trace[selectedIndex]?.callStack ?? [];

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = scrollRef.current?.querySelector<HTMLElement>("[data-active='true']");
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedIndex]);

  function getKeyEvent(step: TraceStep): { type: KeyEventType; text: string } | null {
    if (step.kind === "let" && step.hint) {
      if (step.hint.startsWith("Assert:")) {
        return { type: "assert", text: step.hint };
      }
      if (
        step.hint.includes("toPrimitive") ||
        step.hint.includes("toString") ||
        step.hint.includes("valueOf") ||
        step.hint.includes("[Symbol.")
      ) {
        return { type: "methodCall", text: step.hint };
      }
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
              algoOptions={algoOptions}
              onAlgoChange={onAlgoChange}
              userInputRaw={userInputRaw}
              hasNodes={nodes.length > 0}
              onInputChange={onInputChange}
              onInputCommit={onInputCommit}
            />

            {nodes.map(({ step, index, callStep, callIndex }, idx) => {
              const nodeDepth = step.depth;
              const isActive = index === selectedIndex || (callIndex !== undefined && callIndex === selectedIndex);

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
                      callStep={callStep}
                    />
                  );
                }

                return null;
              };

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
};
