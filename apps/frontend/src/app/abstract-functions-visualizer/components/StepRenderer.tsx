"use client";

import * as React from "react";
import { Box, HStack, VStack, Text, IconButton, Code, Badge } from "@chakra-ui/react";
import { LuChevronDown, LuChevronRight, LuCircleX, LuCircleCheck } from "react-icons/lu";
import type { ExecutedStep, TraceResult } from "@/app/abstract-functions-visualizer/algorithms/executors";

// Lazy load TraceRenderer to avoid circular dependency
const TraceRenderer = React.lazy(() => import("./TraceRenderer").then((m) => ({ default: m.TraceRenderer })));

/**
 * StepRenderer - Отображает отдельный шаг алгоритма
 * Поддерживает пропущенные шаги с указанием причины
 */
export function StepRenderer({
  step,
  level = 0,
  isActive = false,
}: {
  step: ExecutedStep;
  level?: number;
  isActive?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(isActive);
  const hasSubSteps = (step.subSteps?.length ?? 0) > 0 || !!step.nestedTrace;
  const padding = level * 20;

  const bgColor = isActive ? "rgba(249, 227, 26, 0.1)" : undefined;
  const borderColor = isActive ? "rgba(249, 227, 26, 0.3)" : "rgba(148, 163, 184, 0.2)";

  const icon = step.executed ? (
    <LuCircleCheck size={16} color="rgba(34, 197, 94, 0.7)" />
  ) : (
    <LuCircleX size={16} color="rgba(239, 68, 68, 0.5)" />
  );

  const statusBadge = !step.executed && (
    <Badge colorPalette="red" variant="subtle" size="sm">
      Skipped
    </Badge>
  );

  return (
    <Box
      pl={padding}
      borderLeft="2px solid"
      borderColor={borderColor}
      py={2}
      bg={bgColor}
      transition="all 0.2s"
      _hover={{ bg: "rgba(249, 227, 26, 0.05)", borderColor: "rgba(249, 227, 26, 0.5)" }}
    >
      <VStack align="start" gap={2}>
        {/* Step Header */}
        <HStack gap={3} width="100%">
          {hasSubSteps ? (
            <IconButton size="xs" variant="ghost" aria-label="Toggle substeps" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
            </IconButton>
          ) : (
            <Box w={26} />
          )}

          {icon}

          <VStack align="start" gap={0} flex={1}>
            <HStack gap={2}>
              <Text
                fontSize="sm"
                fontWeight={step.executed ? 500 : 400}
                opacity={step.executed ? 1 : 0.6}
                textDecoration={!step.executed ? "line-through" : undefined}
              >
                {step.description}
              </Text>
              {statusBadge}
            </HStack>

            {/* Reason for skipped step */}
            {!step.executed && step.reason && (
              <Text fontSize="xs" opacity={0.5} fontStyle="italic">
                {step.reason}
              </Text>
            )}

            {/* Step result */}
            {step.executed && step.result !== undefined && (
              <HStack gap={2}>
                <Text fontSize="xs" opacity={0.6}>
                  Result:
                </Text>
                <Code fontSize="xs" p={1} borderRadius="sm">
                  {typeof step.result === "string" ? step.result : JSON.stringify(step.result).substring(0, 60)}
                </Code>
              </HStack>
            )}

            {/* Kind badge */}
            <Badge colorPalette="gray" variant="subtle" size="xs">
              {step.kind}
            </Badge>
          </VStack>
        </HStack>

        {/* Substeps and nested traces */}
        {isOpen && (hasSubSteps || !!step.nestedTrace) && (
          <Box width="100%" ml={8}>
            {step.subSteps?.map((substep, idx) => (
              <StepRenderer key={idx} step={substep} level={level + 1} />
            ))}
            {step.nestedTrace && (
              <React.Suspense fallback={<Text fontSize="sm">Loading trace...</Text>}>
                <TraceRenderer trace={step.nestedTrace} level={level + 1} showHeader={false} />
              </React.Suspense>
            )}
          </Box>
        )}
      </VStack>
    </Box>
  );
}
