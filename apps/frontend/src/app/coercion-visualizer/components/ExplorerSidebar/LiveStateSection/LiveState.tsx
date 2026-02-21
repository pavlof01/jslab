"use client";

import { Box, VStack } from "@chakra-ui/react";
import type { Algorithm, SpecValue } from "@/app/coercion-visualizer/spec-runner";
import type { TraceFrame } from "@/app/coercion-visualizer/traceModel";
import { ResultDisplay } from "./ResultDisplay";
import { ExecutionStack } from "./ExecutionStack";

export function LiveState({
  resultValue,
  traceLength,
  currentFrames,
  algoById,
  panelBg,
  panelBorder,
  softSurfaceBgStrong,
}: {
  resultValue?: SpecValue;
  traceLength: number;
  currentFrames: TraceFrame[];
  algoById: Map<string, Algorithm>;
  panelBg: string;
  panelBorder: string;
  softSurfaceBgStrong: string;
}) {
  return (
    <Box>
      <p
        style={{
          fontSize: "10px",
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          opacity: 0.65,
          marginBottom: "12px",
        }}
      >
        Live State
      </p>

      <Box borderRadius="xl" bg={softSurfaceBgStrong} borderWidth="1px" borderColor={panelBorder} p={4}>
        <VStack align="stretch" gap={4}>
          <ResultDisplay resultValue={resultValue} traceLength={traceLength} />

          <ExecutionStack currentFrames={currentFrames} algoById={algoById} panelBorder={panelBorder} />
        </VStack>
      </Box>
    </Box>
  );
}
