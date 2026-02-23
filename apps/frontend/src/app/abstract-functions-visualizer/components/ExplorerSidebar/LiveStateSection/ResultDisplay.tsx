"use client";

import { Box, Code, Text } from "@chakra-ui/react";
import type { SpecValue } from "@/app/coercion-visualizer/spec-runner";
import { formatSpecValue } from "@/app/coercion-visualizer/traceModel";

export function ResultDisplay({ resultValue, traceLength }: { resultValue?: SpecValue; traceLength: number }) {
  return (
    <Box>
      <Text fontSize="xs" opacity={0.75} fontWeight="black" letterSpacing="widest" textTransform="uppercase">
        Result
      </Text>
      <Text fontFamily="mono" fontSize="sm" mt={2}>
        {resultValue ? (
          <Code>
            {resultValue.type}({formatSpecValue(resultValue)})
          </Code>
        ) : (
          <Code>—</Code>
        )}{" "}
        · trace <Code>{traceLength}</Code>
      </Text>
    </Box>
  );
}
