"use client";

import * as React from "react";
import { Box, VStack, HStack, Text, Heading, Badge } from "@chakra-ui/react";
import { StepRenderer } from "./StepRenderer";
import { TraceResult } from "../abstract-operations-tracer";

/**
 * TraceRenderer - Отображает полный результат трассировки алгоритма
 * Показывает все шаги включая пропущенные с указанием причины
 */
export const TraceRenderer = React.memo(function TraceRenderer({
  trace,
  level = 0,
  showHeader = true,
}: {
  trace: TraceResult;
  level?: number;
  showHeader?: boolean;
}) {
  const statusColor = trace.success ? "green" : "red";
  const statusText = trace.success ? "Success" : "Failed";

  return (
    <Box
      borderLeft={level === 0 ? "4px solid" : "2px solid"}
      borderColor={level === 0 ? "rgba(34, 197, 94, 0.3)" : "rgba(148, 163, 184, 0.2)"}
      pl={4}
      py={3}
    >
      <VStack align="start" gap={3}>
        {/* Header with algorithm info */}
        {showHeader && (
          <VStack align="start" gap={1}>
            <HStack gap={2}>
              <Heading size="md">{trace.algorithmName}</Heading>
              <Badge colorPalette={statusColor} variant="solid" size="sm">
                {statusText}
              </Badge>
            </HStack>

            {trace.algorithmDescription && (
              <Text fontSize="sm" opacity={0.7}>
                {trace.algorithmDescription}
              </Text>
            )}

            {/* Input/Output info */}
            <HStack gap={4} fontSize="sm">
              {trace.input !== undefined && (
                <Text>
                  Input: <strong>{JSON.stringify(trace.input).substring(0, 40)}</strong>
                </Text>
              )}
              {trace.output !== undefined && (
                <Text>
                  Output: <strong>{JSON.stringify(trace.output).substring(0, 40)}</strong>
                </Text>
              )}
              {trace.error && (
                <Text color="red.400">
                  Error: <strong>{trace.error.substring(0, 40)}</strong>
                </Text>
              )}
            </HStack>

            {/* Statistics */}
            <HStack gap={3} fontSize="xs" opacity={0.6}>
              <Text>Total Steps: {trace.steps.length}</Text>
              <Text>Executed: {trace.steps.filter((s) => s.executed).length}</Text>
              <Text>Skipped: {trace.steps.filter((s) => !s.executed).length}</Text>
            </HStack>
          </VStack>
        )}

        {/* Steps */}
        <VStack align="stretch" gap={0} width="100%">
          {trace.steps.map((step, idx) => (
            <StepRenderer key={idx} step={step} level={level} />
          ))}
        </VStack>
      </VStack>
    </Box>
  );
});
