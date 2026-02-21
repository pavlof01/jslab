"use client";

import { Box, HStack, Show, Text, VStack } from "@chakra-ui/react";
import type { TraceFrame } from "@/app/coercion-visualizer/traceModel";
import type { Algorithm } from "@/app/coercion-visualizer/spec-runner";

export function ExecutionStack({
  currentFrames,
  algoById,
  panelBorder,
}: {
  currentFrames: TraceFrame[];
  algoById: Map<string, Algorithm>;
  panelBorder: string;
}) {
  return (
    <Box pt={4} borderTopWidth="1px" borderTopColor="rgba(38,38,38,1)">
      <Text fontSize="xs" opacity={0.75} fontWeight="black" letterSpacing="widest" textTransform="uppercase" mb={2}>
        Execution Stack
      </Text>
      <VStack align="stretch" gap={2}>
        <Show when={currentFrames.length === 0}>
          <Text fontSize="sm" opacity={0.7}>
            No active stack.
          </Text>
        </Show>
        <Show when={currentFrames.length > 0}>
          <VStack align="stretch" gap={2}>
            {[...currentFrames]
              .reverse()
              .slice(0, 6)
              .map((frame, idx) => {
                const algo = algoById.get(frame.algoId);
                const title = algo?.title ?? frame.algoId;
                const isTop = idx === 0;
                return (
                  <HStack
                    key={frame.id}
                    gap={3}
                    p={2}
                    borderRadius="lg"
                    bg={isTop ? "rgba(249,227,26,0.06)" : "transparent"}
                    borderWidth={isTop ? "1px" : "0px"}
                    borderColor={isTop ? "rgba(249,227,26,0.20)" : "transparent"}
                    opacity={isTop ? 1 : 0.6}
                  >
                    <Box boxSize="8px" borderRadius="full" bg={isTop ? "#f9e31a" : "rgba(71,85,105,1)"} />
                    <Text fontFamily="mono" fontSize="xs">
                      {title}
                    </Text>
                  </HStack>
                );
              })}
          </VStack>
        </Show>
      </VStack>
    </Box>
  );
}
