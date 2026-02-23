"use client";

import { Box } from "@chakra-ui/react";
import type { SpecValue } from "@/app/coercion-visualizer/spec-runner";
import type { TraceFrame } from "@/app/coercion-visualizer/traceModel";
import type { Algorithm } from "@/app/coercion-visualizer/spec-runner";
import { ErrorDisplay } from "./ErrorDisplay";
import { InputOperands } from "./Input/InputOperands";
import { LiveState } from "./LiveStateSection/LiveState";

export function ExplorerSidebar({
  error,
  resultValue,
  traceLength,
  currentFrames,
  algoById,
  panelBg,
  panelBorder,
  softSurfaceBgStrong,
  traceInputRaw,
  onTraceInputRawChange,
  onTraceInputCommit,
}: {
  error: string | null;
  resultValue?: SpecValue;
  traceLength: number;
  currentFrames: TraceFrame[];
  algoById: Map<string, Algorithm>;
  panelBg: string;
  panelBorder: string;
  softSurfaceBgStrong: string;
  traceInputRaw?: string;
  onTraceInputRawChange?: (next: string) => void;
  onTraceInputCommit?: (input: string) => void;
}) {
  return (
    <Box
      as="aside"
      borderRightWidth={{ base: "0px", lg: "1px" }}
      borderColor={panelBorder}
      bg={panelBg}
      p={4}
      overflow="auto"
      display="flex"
      flexDirection="column"
      gap={6}
    >
      <ErrorDisplay error={error} />

      <InputOperands
        onTraceInputRawChange={onTraceInputRawChange}
        onTraceInputCommit={onTraceInputCommit}
        traceInputRaw={traceInputRaw}
      />

      <LiveState
        resultValue={resultValue}
        traceLength={traceLength}
        currentFrames={currentFrames}
        algoById={algoById}
        panelBg={panelBg}
        panelBorder={panelBorder}
        softSurfaceBgStrong={softSurfaceBgStrong}
      />
    </Box>
  );
}
