"use client";

import { Box, HStack, Text } from "@chakra-ui/react";
import type { TraceStep } from "@/app/abstract-functions-visualizer/spec-runner";
import { formatSpecValue } from "@/app/abstract-functions-visualizer/traceModel";

const KIND_COLOR: Record<string, string> = {
  call: "#34d399",
  return: "#fb7185",
  if: "#f59e0b",
  assert: "#e879f9",
  operation: "#38bdf8",
  throw: "#fb7185",
  note: "#a78bfa",
};

const KIND_LABEL: Record<string, string> = {
  call: "CALL",
  return: "RETURN",
  if: "CHECK",
  assert: "ASSERT",
  operation: "COMPUTE",
  throw: "THROW",
  note: "NOTE",
};

function stepText(step: TraceStep): string {
  if (step.kind === "call" && step.algoId) {
    const args = (step.inputs ?? []).map((a) => formatSpecValue(a, 20)).join(", ");
    return step.hint ?? `${step.algoId}(${args})`;
  }
  if (step.kind === "return") {
    return step.hint ?? (step.value ? `return ${formatSpecValue(step.value, 36)}` : "return");
  }
  if (step.kind === "if") {
    return step.hint ?? "condition";
  }
  return step.hint ?? step.description ?? "";
}

function stepOutcome(step: TraceStep): { text: string; good: boolean } | null {
  if (step.kind === "call") {
    return step.output ? { text: formatSpecValue(step.output, Infinity), good: true } : null;
  }
  if (step.kind === "return") {
    return step.value ? { text: formatSpecValue(step.value, Infinity), good: true } : null;
  }
  if (step.kind === "if") {
    return step.taken === false ? { text: "false", good: false } : null;
  }
  return step.result ? { text: formatSpecValue(step.result, Infinity), good: true } : null;
}

interface Props {
  step: TraceStep;
  isActive: boolean;
  onSelect: () => void;
}

export function StepRow({ step, isActive, onSelect }: Props) {
  const color = KIND_COLOR[step.kind] ?? "#a78bfa";
  const label = KIND_LABEL[step.kind] ?? step.kind.toUpperCase();
  const text = stepText(step);
  const outcome = stepOutcome(step);
  const hint = isActive && step.kind !== "call" ? step.hint : undefined;
  const isSkipped = step.kind === "if" && step.taken === false;

  return (
    <Box
      as="button"
      display="block"
      w="full"
      textAlign="left"
      cursor="pointer"
      position="relative"
      onClick={onSelect}
      borderRadius="5px"
      border="1px solid"
      borderColor={isActive ? `${color}50` : "transparent"}
      bg={isActive ? `${color}12` : "transparent"}
      mb="1px"
      opacity={isSkipped ? 0.55 : 1}
      transition="all 120ms"
      _hover={{ bg: isActive ? `${color}12` : "rgba(255,255,255,0.02)" }}
      data-active={isActive || undefined}
    >
      {isActive && (
        <Box
          position="absolute"
          left={0}
          top="20%"
          bottom="20%"
          w="3px"
          borderRadius="0 2px 2px 0"
          bg={color}
          boxShadow={`0 0 6px ${color}`}
        />
      )}

      <HStack pl={isActive ? "14px" : "10px"} pr="10px" py="5px" gap={0} align="center" minH="32px">
        <Box flexShrink={0} w="64px" textAlign="right" pr="8px">
          <Text fontSize="8px" fontWeight="black" letterSpacing="wider" color={color} opacity={isActive ? 1 : 0.5}>
            {label}
          </Text>
        </Box>

        <Text
          flex={1}
          fontSize="11px"
          color={isActive ? "#e5e7eb" : "#4b5563"}
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          transition="color 120ms"
        >
          {text}
        </Text>

        {outcome && (
          <Text
            flexShrink={0}
            fontSize="9px"
            color={outcome.good ? "#34d399" : "#fb7185"}
            ml="8px"
            whiteSpace="normal"
            wordBreak="break-word"
          >
            {outcome.text}
          </Text>
        )}
      </HStack>

      {isActive && hint && (
        <Box pl="90px" pr="10px" pb="8px">
          <Text fontSize="11px" color="#6b7280" lineClamp={3}>
            {hint}
          </Text>
        </Box>
      )}
    </Box>
  );
}
