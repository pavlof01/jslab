"use client";

import { useMemo } from "react";
import { Badge, Box, Flex, HStack, Text, VStack } from "@chakra-ui/react";

import { parseV8Trace, summarizeV8Trace, type V8TraceEvent } from "@/lib/parseV8Trace";

const KIND_STYLE: Record<V8TraceEvent["kind"], { label: string; color: string }> = {
  optimize: { label: "OPT", color: "green.400" },
  deopt: { label: "DEOPT", color: "red.400" },
  ic: { label: "IC", color: "blue.300" },
};

export default function DeoptView({ output }: { output: string }) {
  const events = useMemo(() => parseV8Trace(output), [output]);
  const summary = useMemo(() => summarizeV8Trace(events), [events]);

  if (!output.trim()) {
    return (
      <Box p={6}>
        <Text color="whiteAlpha.500" fontSize="sm">
          Run to trace optimization and deoptimization events. Deopts happen when V8 has to throw away optimized code —
          usually because a value’s type changed from what the optimizer assumed.
        </Text>
      </Box>
    );
  }

  if (events.length === 0) {
    return (
      <Box p={6}>
        <Text color="whiteAlpha.600" fontSize="sm">
          No optimization or deoptimization events. Try a hot loop (e.g. call a function a few hundred times) so V8
          tiers it up — then feed it a changing type to force a deopt.
        </Text>
      </Box>
    );
  }

  return (
    <VStack align="stretch" gap={3} p={4}>
      <HStack gap={2} wrap="wrap">
        <Badge colorPalette="green">{summary.optimize} optimized</Badge>
        <Badge colorPalette="red">{summary.deopt} deoptimized</Badge>
        {summary.ic > 0 && <Badge colorPalette="blue">{summary.ic} IC</Badge>}
        {summary.deoptedFns.length > 0 && (
          <Text fontSize="xs" color="whiteAlpha.600">
            deopted: {summary.deoptedFns.join(", ")}
          </Text>
        )}
      </HStack>

      <VStack align="stretch" gap={1}>
        {events.map((e, i) => {
          const style = KIND_STYLE[e.kind];
          return (
            <Flex
              key={i}
              gap={3}
              align="baseline"
              px={3}
              py={2}
              borderRadius="md"
              borderLeft="3px solid"
              borderColor={style.color}
              bg="whiteAlpha.50"
            >
              <Text fontFamily="mono" fontSize="10px" fontWeight="700" color={style.color} minW={12}>
                {style.label}
                {e.bailout ? `·${e.bailout}` : ""}
              </Text>
              <Box flex="1" minW={0}>
                <Flex gap={2} align="baseline" wrap="wrap">
                  {e.fn && (
                    <Text fontFamily="mono" fontSize="sm" color="whiteAlpha.900">
                      {e.fn}
                    </Text>
                  )}
                  {e.location && (
                    <Text fontFamily="mono" fontSize="xs" color="whiteAlpha.500">
                      {e.location}
                    </Text>
                  )}
                </Flex>
                {e.reason && (
                  <Text fontSize="xs" color={e.kind === "deopt" ? "red.200" : "whiteAlpha.700"}>
                    {e.reason}
                  </Text>
                )}
              </Box>
            </Flex>
          );
        })}
      </VStack>
    </VStack>
  );
}
