"use client";

import * as React from "react";
import { Box, Card, Text, VStack } from "@chakra-ui/react";

import type { NestedTraceInfo, TraceStep } from "@/app/abstract-functions-visualizer/spec-runner";
import { BranchNode } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/BranchNode";
import { TraceStepNode } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/TraceStepNode";
import { FaArrowRight } from "react-icons/fa6";

export function NestedTraceSection({
  nestedTrace,
  parentNodeDepth,
  showSkipped = false,
}: {
  nestedTrace: NestedTraceInfo;
  parentNodeDepth: number;
  showSkipped?: boolean;
}) {
  const nestedIndent = parentNodeDepth + 1;
  const steps = nestedTrace.steps;
  const inputPreview = (() => {
    try {
      const raw = (nestedTrace.input as any)?.value ?? nestedTrace.input;
      return JSON.stringify(raw).slice(0, 30);
    } catch {
      return '…';
    }
  })();

  return (
    <Box>
      <VStack align="stretch" gap={0}>
        {/* Nested algorithm entry point */}
        <Box pl={nestedIndent * 12} display="flex" alignItems="center" gap={2} mb={2}>
          <FaArrowRight size={12} opacity={0.5} />
          <Card.Root
            size="sm"
            borderWidth="1px"
            borderColor="rgba(255,255,255,0.1)"
            bg="rgba(100,150,200,0.05)"
            maxW="320px"
            py={2}
            px={3}
          >
            <Text fontSize="xs" fontFamily="mono" fontWeight="500">
              {nestedTrace.algorithmName}({inputPreview}...)
            </Text>
          </Card.Root>
        </Box>

        {/* Nested steps */}
        {steps.map((step, idx) => {
          if (step.kind === "call" && idx === 0) return null; // Skip entry call
          if (step.kind === "ret") return null; // Skip return

          const isFirst = idx === 1; // First visible step after entry call
          const isLet = step.kind === "let";
          const isIf = step.kind === "if";

          if (isIf) {
            const ifStep = step as Extract<TraceStep, { kind: "if" }>;
            if (!showSkipped && ifStep.decision?.taken === "else") return null;
            return (
              <React.Fragment key={`nested:${idx}:${step.kind}`}>
                <BranchNode
                  step={ifStep}
                  index={idx}
                  showConnector={!isFirst}
                  nodeDepth={nestedIndent}
                  isActive={false}
                  algoById={new Map()}
                  onSelectIndex={undefined}
                />
                {(step as any).nestedTrace && (
                  <NestedTraceSection nestedTrace={(step as any).nestedTrace} parentNodeDepth={nestedIndent} showSkipped={showSkipped} />
                )}
              </React.Fragment>
            );
          }

          if (isLet) {
            return (
              <React.Fragment key={`nested:${idx}:${step.kind}`}>
                <TraceStepNode
                  step={step as Extract<TraceStep, { kind: "let" }>}
                  index={idx}
                  showConnector={!isFirst}
                  nodeDepth={nestedIndent}
                  isActive={false}
                  onSelectIndex={undefined}
                />
                {(step as any).nestedTrace && (
                  <NestedTraceSection nestedTrace={(step as any).nestedTrace} parentNodeDepth={nestedIndent} showSkipped={showSkipped} />
                )}
              </React.Fragment>
            );
          }

          return null;
        })}
      </VStack>
    </Box>
  );
}
