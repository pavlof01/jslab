"use client";

import { Box, Card, Code, HStack, Tag, Text, VStack } from "@chakra-ui/react";

import type { TraceStep } from "@/app/abstract-functions-visualizer/spec-runner";
import { formatNodePath, formatSpecValue, type NodePath } from "@/app/abstract-functions-visualizer/traceModel";
import { getPrimaryEnvDelta } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/executionTreeUtils";
import { ALGO_SPEC_URL } from "@/app/abstract-functions-visualizer/adapters/trace-node-adapter";
import { StepTransitions } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/StepTransitions";

export function TraceStepNode({
  step,
  index,
  showConnector,
  nodeDepth,
  isActive,
  onSelectIndex,
}: {
  step: Extract<TraceStep, { kind: "call" | "let" | "return" }>;
  index: number;
  showConnector: boolean;
  nodeDepth: number;
  isActive: boolean;
  onSelectIndex?: (index: number) => void;
}) {
  const clickable = !!onSelectIndex;

  const palette =
    step.kind === "call" ? "orange" : step.kind === "let" ? (step.transitions?.length ? "yellow" : "blue") : "green";

  // Color mappings for different step types
  const colorMap: Record<string, { border: string; bg: string; shadow: string; leftBorder: string }> = {
    orange: {
      border: isActive ? "#ff9f40" : "#d4a574",
      bg: isActive ? "rgba(255,159,64,0.1)" : "rgba(255,159,64,0.05)",
      shadow: isActive ? "0 0 20px rgba(255,159,64,0.15)" : "0 0 10px rgba(255,159,64,0.08)",
      leftBorder: "#ff9f40",
    },
    yellow: {
      border: isActive ? "#f9e31a" : "#d4a574",
      bg: isActive ? "rgba(249,227,26,0.1)" : "rgba(249,227,26,0.05)",
      shadow: isActive ? "0 0 22px rgba(249,227,26,0.15)" : "0 0 10px rgba(249,227,26,0.08)",
      leftBorder: "#f9e31a",
    },
    blue: {
      border: isActive ? "#60a5fa" : "#5099d4",
      bg: isActive ? "rgba(96,165,250,0.1)" : "rgba(96,165,250,0.05)",
      shadow: isActive ? "0 0 20px rgba(96,165,250,0.15)" : "0 0 10px rgba(96,165,250,0.08)",
      leftBorder: "#60a5fa",
    },
    green: {
      border: isActive ? "#4ade80" : "#5cb85c",
      bg: isActive ? "rgba(74,222,128,0.1)" : "rgba(74,222,128,0.05)",
      shadow: isActive ? "0 0 20px rgba(74,222,128,0.15)" : "0 0 10px rgba(74,222,128,0.08)",
      leftBorder: "#4ade80",
    },
  };

  const colors = colorMap[palette] || colorMap.blue;

  const algoUrl = step.kind === "call" ? ALGO_SPEC_URL[step.toAlgo] : undefined;

  const titleText =
    step.kind === "call"
      ? "Call"
      : step.kind === "let"
        ? "Let"
        : step.kind === "return"
          ? "Return"
          : "Step";

  const detail = (() => {
    if (step.kind === "call") {
      if (step.result && step.result.type !== "Undefined") {
        return `→ ${formatSpecValue(step.result, 40)}`;
      }
      return `${step.args.length} arg(s)`;
    }
    if (step.kind === "let") return step.hint ?? formatNodePath(step.nodePath as NodePath);
    return undefined;
  })();

  const delta = getPrimaryEnvDelta(step);

  // Hover shadow - enhanced version of the base shadow
  const hoverShadow =
    palette === "orange"
      ? "0 0 24px rgba(255,159,64,0.25)"
      : palette === "yellow"
        ? "0 0 26px rgba(249,227,26,0.25)"
        : palette === "blue"
          ? "0 0 24px rgba(96,165,250,0.25)"
          : "0 0 24px rgba(74,222,128,0.25)";

  return (
    <Box pl={nodeDepth * 12}>
      {showConnector ? <Box w="2px" h={10} bg={colors.leftBorder} mx="auto" opacity={isActive ? 0.8 : 0.4} /> : null}
      <Card.Root
        size="sm"
        borderWidth="1px"
        borderColor={colors.border}
        bg={colors.bg}
        boxShadow={colors.shadow}
        cursor={clickable ? "pointer" : undefined}
        onClick={clickable ? () => onSelectIndex?.(index) : undefined}
        w={{ base: "full", md: "520px" }}
        transition="all 140ms ease"
        borderLeftWidth="4px"
        borderLeftColor={colors.leftBorder}
        borderRadius="0.5rem"
        _hover={clickable ? { boxShadow: hoverShadow } : undefined}
      >
        <Card.Header pb={2}>
          <HStack justify="space-between" gap={3} flexWrap="wrap">
            <HStack gap={2} flexWrap="wrap">
              <Tag.Root size="sm" variant={isActive ? "solid" : "outline"} colorPalette={palette}>
                <Tag.Label fontWeight={isActive ? "600" : "500"}>{titleText}</Tag.Label>
              </Tag.Root>
              {step.kind === "call" && (
                algoUrl ? (
                  <a
                    href={algoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ textDecoration: "none" }}
                  >
                    <Text fontSize="xs" fontFamily="mono" fontWeight="600" color={colors.leftBorder} opacity={0.9} _hover={{ textDecoration: "underline", opacity: 1 }}>
                      {step.toAlgo}
                    </Text>
                  </a>
                ) : (
                  <Text fontSize="xs" fontFamily="mono" fontWeight="600" color={colors.leftBorder} opacity={0.9}>
                    {step.toAlgo}
                  </Text>
                )
              )}
              {step.kind === "return" && step.value.type !== "Undefined" && step.value.type !== "Null" && (
                <Code fontSize="xs">{formatSpecValue(step.value, 60)}</Code>
              )}
              <Text fontSize="xs" opacity={0.7} fontFamily="mono">
                trace <Code>#{index + 1}</Code>
              </Text>
            </HStack>
            {detail ? (
              <Text fontSize="xs" opacity={0.75} fontFamily="mono">
                {detail}
              </Text>
            ) : null}
          </HStack>
        </Card.Header>
        <Card.Body pt={0}>
          {step.kind === "return" && step.value.type !== "Undefined" && step.value.type !== "Null" ? (
            <HStack gap={2} flexWrap="wrap" align="center">
              <Tag.Root size="sm" variant={isActive ? "solid" : "outline"} colorPalette="green">
                <Tag.Label fontWeight={isActive ? "600" : "500"}>{step.value.type}</Tag.Label>
              </Tag.Root>
              <Code>{formatSpecValue(step.value, 84)}</Code>
            </HStack>
          ) : delta ? (
            <HStack gap={2} flexWrap="wrap" align="center">
              <Text fontSize="xs" opacity={0.7}>
                set
              </Text>
              <Code>{delta.name}</Code>
              <Text fontSize="xs" opacity={0.7}>
                ←
              </Text>
              <Tag.Root size="sm" variant={isActive ? "solid" : "outline"} colorPalette="blue">
                <Tag.Label fontWeight={isActive ? "600" : "500"}>{delta.value.type}</Tag.Label>
              </Tag.Root>
              <Code>{formatSpecValue(delta.value, 84)}</Code>
            </HStack>
          ) : step.kind === "call" ? (
            <Text fontFamily="mono" fontSize="xs" opacity={0.9}>
              {step.toAlgo}({step.args.map((a) => formatSpecValue(a, 48)).join(", ")})
            </Text>
          ) : null}

          {step.kind === "let" || step.kind === "return" ? (
            step.transitions?.length ? (
              <StepTransitions transitions={step.transitions} />
            ) : null
          ) : null}
        </Card.Body>
      </Card.Root>
    </Box>
  );
}
