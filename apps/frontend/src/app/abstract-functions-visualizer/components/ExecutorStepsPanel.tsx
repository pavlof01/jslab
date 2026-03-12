/**
 * ExecutorStepsPanel - Отображает шаги из executors (ToNumber, etc.)
 * Показывает все шаги включая пропущенные с причинами
 */

"use client";

import * as React from "react";
import { Box, VStack, HStack, Text, Collapsible, Badge, IconButton } from "@chakra-ui/react";
import { LuChevronDown, LuChevronRight, LuCircleX, LuCircleCheck, LuExternalLink } from "react-icons/lu";
import type { ExecutedStep, TraceResult } from "@/app/abstract-functions-visualizer/algorithms/executors";
import { useColorModeValue } from "@/components/ui/color-mode";

export function ExecutorStepsPanel({
  traceResult,
  selectedStepIndex,
  onSelectStepIndex,
}: {
  traceResult: TraceResult | null;
  selectedStepIndex?: number;
  onSelectStepIndex?: (index: number) => void;
}) {
  const panelBg = useColorModeValue("#ffffff", "rgba(20,20,20,0.30)");
  const panelBorder = useColorModeValue("#e2e8f0", "#262626");
  const softSurfaceBgStrong = useColorModeValue("rgba(255,255,255,0.80)", "rgba(0,0,0,0.18)");
  const algorithmSpecUrl = resolveAlgorithmSpecUrl(traceResult);

  if (!traceResult) {
    return (
      <Box
        as="aside"
        borderLeftWidth={{ base: "0px", lg: "1px" }}
        borderColor={panelBorder}
        bg={panelBg}
        p={4}
        overflow="auto"
        display="flex"
        flexDirection="column"
        minH="92vh"
      >
        <Text fontSize="sm" opacity={0.6}>
          No trace available
        </Text>
      </Box>
    );
  }

  const handleStepClick = (index: number) => {
    onSelectStepIndex?.(index);
  };

  return (
    <Box
      as="aside"
      borderLeftWidth={{ base: "0px", lg: "1px" }}
      borderColor={panelBorder}
      bg={panelBg}
      p={4}
      overflow="auto"
      display="flex"
      flexDirection="column"
      minH="92vh"
    >
      <Box mb={4}>
        <HStack justify="space-between" align="flex-start" mb={2}>
          <Text fontSize="10px" fontWeight="black" letterSpacing="0.2em" opacity={0.65} mb={0}>
            ALGORITHM: {traceResult.algorithmName}
          </Text>
          <IconButton
            aria-label={`Open ${traceResult.algorithmName} specification`}
            size="2xs"
            variant="ghost"
            disabled={!algorithmSpecUrl}
            title={algorithmSpecUrl ? "Open ECMAScript specification" : "Specification URL is unavailable"}
            onClick={() => {
              if (algorithmSpecUrl) {
                window.open(algorithmSpecUrl, "_blank", "noopener,noreferrer");
              }
            }}
          >
            <LuExternalLink size={13} />
          </IconButton>
        </HStack>
        <Text fontSize="xs" opacity={0.75} mb={2}>
          {traceResult.algorithmDescription}
        </Text>
      </Box>

      <Box borderRadius="xl" bg={softSurfaceBgStrong} borderWidth="1px" borderColor={panelBorder} p={4} mb={4}>
        <VStack align="stretch" gap={2}>
          <HStack justify="space-between">
            <Text fontSize="xs" opacity={0.75} fontWeight="bold">
              Total Steps
            </Text>
            <Badge>{traceResult.steps.length}</Badge>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="xs" opacity={0.75} fontWeight="bold">
              Executed
            </Text>
            <Badge colorPalette="green">{traceResult.steps.filter((s) => s.executed).length}</Badge>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="xs" opacity={0.75} fontWeight="bold">
              Skipped
            </Text>
            <Badge colorPalette="red">{traceResult.steps.filter((s) => !s.executed).length}</Badge>
          </HStack>
        </VStack>
      </Box>

      <Box flex="1" overflow="auto">
        <Text fontSize="10px" fontWeight="black" textTransform="uppercase" letterSpacing="0.2em" opacity={0.65} mb={3}>
          Steps
        </Text>

        <VStack align="stretch" gap={2}>
          {traceResult.steps.map((step, idx) => (
            <StepItem
              key={idx}
              step={step}
              index={idx}
              isSelected={selectedStepIndex === idx}
              onClick={() => handleStepClick(idx)}
            />
          ))}
        </VStack>
      </Box>
    </Box>
  );
}

const SPEC_URL_BY_ALGORITHM_ID: Record<string, string> = {
  ToNumber: "https://262.ecma-international.org/#sec-tonumber",
  toNumber: "https://262.ecma-international.org/#sec-tonumber",
  StringToNumber: "https://262.ecma-international.org/#sec-stringtonumber",
  stringToNumber: "https://262.ecma-international.org/#sec-stringtonumber",
  ToPrimitive: "https://262.ecma-international.org/#sec-toprimitive",
  toPrimitive: "https://262.ecma-international.org/#sec-toprimitive",
  OrdinaryToPrimitive: "https://262.ecma-international.org/#sec-ordinarytoprimitive",
  ordinaryToPrimitive: "https://262.ecma-international.org/#sec-ordinarytoprimitive",
};

const SPEC_URL_BY_ALGORITHM_NAME: Record<string, string> = {
  "ToNumber ( arg )": "https://262.ecma-international.org/#sec-tonumber",
  ToNumber: "https://262.ecma-international.org/#sec-tonumber",
  StringToNumber: "https://262.ecma-international.org/#sec-stringtonumber",
  ToPrimitive: "https://262.ecma-international.org/#sec-toprimitive",
  OrdinaryToPrimitive: "https://262.ecma-international.org/#sec-ordinarytoprimitive",
};

function resolveAlgorithmSpecUrl(traceResult: TraceResult | null): string | undefined {
  if (!traceResult) return undefined;
  return (
    traceResult.algorithmUrl ??
    SPEC_URL_BY_ALGORITHM_ID[traceResult.algorithmId] ??
    SPEC_URL_BY_ALGORITHM_NAME[traceResult.algorithmName]
  );
}

function StepItem({
  step,
  index,
  isSelected,
  onClick,
}: {
  step: ExecutedStep;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const panelBorder = useColorModeValue("#e2e8f0", "#262626");
  const selectedBg = useColorModeValue("rgba(249, 227, 26, 0.1)", "rgba(249, 227, 26, 0.05)");
  const [isOpen, setIsOpen] = React.useState(false);

  const borderColor = isSelected ? "rgba(249, 227, 26, 0.3)" : panelBorder;
  const bgColor = isSelected ? selectedBg : undefined;

  return (
    <Collapsible.Root open={isOpen} onOpenChange={(details) => setIsOpen(details.open)}>
      <Box
        borderRadius="md"
        border="1px solid"
        borderColor={borderColor}
        bg={bgColor}
        p={3}
        cursor="pointer"
        onClick={onClick}
        _hover={{ borderColor: "rgba(249, 227, 26, 0.5)" }}
        transition="all 0.2s"
      >
        <HStack justify="space-between" mb={step.executed && step.result ? 2 : 0}>
          <HStack gap={2} flex="1">
            {step.executed ? (
              <LuCircleCheck size={16} color="rgba(34, 197, 94, 0.7)" />
            ) : (
              <LuCircleX size={16} color="rgba(239, 68, 68, 0.5)" />
            )}
            <Text fontSize="sm" flex="1" fontWeight={step.executed ? "500" : "400"}>
              {step.description}
            </Text>
          </HStack>

          <HStack gap={2}>
            {!step.executed && (
              <Badge colorPalette="red" variant="subtle" size="sm">
                Skipped
              </Badge>
            )}
            <Collapsible.Trigger asChild>
              <Box cursor="pointer" onClick={(e) => e.stopPropagation()}>
                {isOpen ? <LuChevronDown size={16} /> : <LuChevronRight size={16} />}
              </Box>
            </Collapsible.Trigger>
          </HStack>
        </HStack>

        {!step.executed && step.reason && (
          <Text fontSize="xs" opacity={0.6} fontStyle="italic" pl={6}>
            {step.reason}
          </Text>
        )}

        {step.executed && step.result !== undefined && (
          <Text fontSize="xs" opacity={0.7} pl={6}>
            Result: <code>{JSON.stringify(step.result)}</code>
          </Text>
        )}
      </Box>

      {step.nestedTrace && (
        <Collapsible.Content>
          <Box pl={4} mt={2} borderLeftWidth="2px" borderColor="rgba(249, 227, 26, 0.2)">
            <Text fontSize="xs" opacity={0.7} mb={3} fontWeight="bold">
              📍 Nested: {step.nestedTrace.algorithmName}
            </Text>
            <VStack align="stretch" gap={2}>
              {step.nestedTrace.steps.map((nestedStep, nestedIdx) => (
                <NestedStepItem key={nestedIdx} step={nestedStep} depth={1} />
              ))}
            </VStack>
          </Box>
        </Collapsible.Content>
      )}
    </Collapsible.Root>
  );
}

function NestedStepItem({ step, depth = 0 }: { step: ExecutedStep; depth?: number }) {
  const panelBorder = useColorModeValue("#e2e8f0", "#262626");
  const [isOpen, setIsOpen] = React.useState(false);
  const hasNestedTrace = !!step.nestedTrace;
  const hasSubSteps = !!step.subSteps && step.subSteps.length > 0;
  const hasChildren = hasNestedTrace || hasSubSteps;

  return (
    <Collapsible.Root open={isOpen} onOpenChange={(details) => setIsOpen(details.open)}>
      <Box
        borderRadius="sm"
        border="1px solid"
        borderColor={panelBorder}
        p={2}
        fontSize="xs"
        opacity={0.85}
        _hover={{ borderColor: "rgba(249, 227, 26, 0.3)" }}
        transition="all 0.2s"
      >
        <HStack justify="space-between" gap={2}>
          <HStack gap={2} flex="1">
            {step.executed ? (
              <LuCircleCheck size={12} color="rgba(34, 197, 94, 0.7)" />
            ) : (
              <LuCircleX size={12} color="rgba(239, 68, 68, 0.5)" />
            )}
            <Text flex="1">{step.description}</Text>
          </HStack>

          {hasChildren && (
            <Collapsible.Trigger asChild>
              <Box cursor="pointer" onClick={(e) => e.stopPropagation()}>
                {isOpen ? <LuChevronDown size={12} /> : <LuChevronRight size={12} />}
              </Box>
            </Collapsible.Trigger>
          )}
        </HStack>

        {!step.executed && step.reason && (
          <Text fontSize="xs" opacity={0.6} fontStyle="italic" pl={6} mt={1}>
            {step.reason}
          </Text>
        )}
      </Box>

      {hasChildren && (
        <Collapsible.Content>
          <VStack align="stretch" gap={2} pl={3} mt={2}>
            {/* Show subSteps (for conditional/loop blocks) */}
            {hasSubSteps && (
              <Box borderLeftWidth="2px" borderColor="rgba(249, 227, 26, 0.1)" pl={2}>
                <VStack align="stretch" gap={1}>
                  {step.subSteps!.map((subStep, subIdx) => (
                    <NestedStepItem key={subIdx} step={subStep} depth={(depth ?? 0) + 1} />
                  ))}
                </VStack>
              </Box>
            )}

            {/* Show nestedTrace (for algorithm calls) */}
            {step.nestedTrace && (
              <Box borderLeftWidth="2px" borderColor="rgba(249, 227, 26, 0.15)" pl={2}>
                <Text fontSize="xs" opacity={0.65} mb={2} fontWeight="600">
                  ↳ {step.nestedTrace.algorithmName}
                </Text>
                <VStack align="stretch" gap={1}>
                  {step.nestedTrace.steps.map((nestedStep, nestedIdx) => (
                    <NestedStepItem key={nestedIdx} step={nestedStep} depth={(depth ?? 0) + 1} />
                  ))}
                </VStack>
              </Box>
            )}
          </VStack>
        </Collapsible.Content>
      )}
    </Collapsible.Root>
  );
}
