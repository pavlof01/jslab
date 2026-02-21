"use client";

import { Box, Text, VStack } from "@chakra-ui/react";
import { AlgorithmModeInput } from "./AlgorithmModeInput";

export function InputOperands({
  traceInputRaw,
  onTraceInputRawChange,
  onTraceInputCommit,
}: {
  traceInputRaw?: string;
  onTraceInputRawChange?: (next: string) => void;
  onTraceInputCommit?: (input: string) => void;
}) {
  return (
    <Box>
      <Text fontSize="10px" fontWeight="black" textTransform="uppercase" letterSpacing="0.2em" opacity={0.65} mb={3}>
        Input Operands
      </Text>

      <VStack align="stretch" gap={4}>
        <AlgorithmModeInput
          onTraceInputRawChange={onTraceInputRawChange}
          onTraceInputCommit={onTraceInputCommit}
          traceInputRaw={traceInputRaw}
        />
      </VStack>
    </Box>
  );
}
