"use client";

import { Box, HStack, Text } from "@chakra-ui/react";
import type { TraceStep, SpecValue } from "@/app/abstract-functions-visualizer/spec-runner";
import { formatSpecValue } from "@/app/abstract-functions-visualizer/traceModel";
import type { StepNode } from "./treeBuilder";

const KIND_COLOR: Record<string, string> = {
  call: "#34d399",
  return: "#fb7185",
  if: "#f59e0b",
  let_assert: "#e879f9",
  let_call: "#34d399",
  let_transition: "#38bdf8",
  let: "#a78bfa",
};

const KIND_LABEL: Record<string, string> = {
  call: "CALL",
  return: "RETURN",
  if: "CHECK",
  let_assert: "ASSERT",
  let_call: "CALL",
  let_transition: "COMPUTE",
  let: "ASSIGN",
};

function resolveKind(step: TraceStep): string {
  if (step.kind === "let") {
    if (step.hint?.includes("Assert")) return "let_assert";
    if (step.callStep) return "let_call";
    if (step.transitions?.length) return "let_transition";
    return "let";
  }
  return step.kind;
}

function specStep(step: TraceStep): string | null {
  if (step.kind === "call") return null;
  return step.specStep != null ? `§${step.specStep}` : null;
}

function stepText(step: TraceStep): string {
  switch (step.kind) {
    case "call":
      return `${step.toAlgo}(${step.args.map((a) => formatSpecValue(a, 32)).join(", ")})`;
    case "return":
      return step.hint ?? `return ${formatSpecValue(step.value, 36)}`;
    case "if":
      return step.hint ?? step.condPretty ?? "condition";
    case "let": {
      if (step.hint?.includes("Assert")) return step.hint;
      if (step.callStep) {
        const args = step.callStep.args.map((a: SpecValue) => formatSpecValue(a, 20)).join(", ");
        return `${step.varName ?? "?"} = ${step.callStep.toAlgo}(${args})`;
      }
      const entry = Object.entries(step.envDelta ?? {})[0];
      if (entry) return `${entry[0]} ← ${formatSpecValue(entry[1], 32)}`;
      return step.varName ?? "";
    }
  }
}

function stepOutcome(step: TraceStep): { text: string; good: boolean } | null {
  switch (step.kind) {
    case "call":
      return step.result ? { text: formatSpecValue(step.result, 20), good: true } : null;
    case "return":
      return { text: formatSpecValue(step.value, 20), good: true };
    case "if":
      if (step.isSkipped) return { text: "false", good: false };
      return null;
    case "let": {
      const entry = Object.entries(step.envDelta ?? {})[0];
      return entry ? { text: formatSpecValue(entry[1], 20), good: true } : null;
    }
  }
}

function expandedPills(step: TraceStep): Array<{ key: string; val: string }> {
  if (step.kind === "let") {
    return Object.entries(step.envDelta ?? {}).map(([k, v]) => ({ key: k, val: formatSpecValue(v, 48) }));
  }
  if (step.kind === "call") {
    return step.args.map((a, i) => ({ key: `arg${i}`, val: formatSpecValue(a, 48) }));
  }
  if (step.kind === "return") {
    return [{ key: "value", val: formatSpecValue(step.value, 64) }];
  }
  return [];
}

interface Props {
  node: StepNode;
  isActive: boolean;
  onSelect: () => void;
}

export function StepRow({ node, isActive, onSelect }: Props) {
  const { step } = node;
  const resolved = resolveKind(step);
  const color = KIND_COLOR[resolved] ?? "#a78bfa";
  const label = KIND_LABEL[resolved] ?? "LET";
  const spec = specStep(step);
  const text = stepText(step);
  const outcome = stepOutcome(step);
  const pills = isActive ? expandedPills(step) : [];
  const hint = isActive && step.kind !== "call" ? step.hint : undefined;

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
      transition="all 120ms"
      _hover={{ bg: isActive ? `${color}12` : "rgba(255,255,255,0.02)" }}
      data-active={isActive || undefined}
    >
      {/* Active left strip */}
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

      {/* Main row */}
      <HStack pl={isActive ? "14px" : "10px"} pr="10px" py="5px" gap={0} align="center" minH="32px">
        {/* Kind badge */}
        <Box flexShrink={0} w="52px" textAlign="right" pr="8px">
          <Text fontSize="8px" fontWeight="black" letterSpacing="wider" color={color} opacity={isActive ? 1 : 0.5}>
            {label}
          </Text>
        </Box>

        {/* Spec step */}
        <Box flexShrink={0} w="28px">
          {spec && (
            <Text fontSize="9px" color="#374151">
              {spec}
            </Text>
          )}
        </Box>

        {/* Step text */}
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

        {/* Outcome */}
        {outcome && (
          <Text flexShrink={0} fontSize="9px" color={outcome.good ? "#34d399" : "#fb7185"} ml="8px">
            {outcome.text}
          </Text>
        )}
      </HStack>

      {/* Expanded area */}
      {isActive && (hint || pills.length > 0) && (
        <Box pl="90px" pr="10px" pb="8px">
          {hint && (
            <Text fontSize="11px" color="#6b7280" mb={pills.length > 0 ? "6px" : 0} lineClamp={3}>
              {hint}
            </Text>
          )}
          {pills.length > 0 && (
            <HStack flexWrap="wrap" gap="5px">
              {pills.map((p) => (
                <HStack
                  key={p.key}
                  gap={0}
                  borderRadius="3px"
                  overflow="hidden"
                  border="1px solid #1f2937"
                  flexShrink={0}
                >
                  <Box px="5px" py="2px" bg="#0a0c12">
                    <Text fontSize="9px" color="#4b5563">
                      {p.key}
                    </Text>
                  </Box>
                  <Box px="5px" py="2px">
                    <Text fontSize="9px" color="#a78bfa">
                      {p.val}
                    </Text>
                  </Box>
                </HStack>
              ))}
            </HStack>
          )}
        </Box>
      )}
    </Box>
  );
}
