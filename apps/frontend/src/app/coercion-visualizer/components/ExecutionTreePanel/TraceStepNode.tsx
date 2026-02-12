"use client";

import { Box, Card, Code, HStack, Tag, Text, VStack } from "@chakra-ui/react";

import type { TraceStep } from "@/app/coercion-visualizer/spec-runner";
import { formatNodePath, formatSpecValue, type NodePath } from "@/app/coercion-visualizer/traceModel";
import { getPrimaryEnvDelta } from "@/app/coercion-visualizer/components/ExecutionTreePanel/executionTreeUtils";
import { StepTransitions } from "@/app/coercion-visualizer/components/ExecutionTreePanel/StepTransitions";

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
  const baseBorder = isActive ? "#f9e31a" : "rgba(38,38,38,1)";
  const baseBg = isActive ? "rgba(249,227,26,0.08)" : "rgba(20,20,20,0.55)";
  const baseShadow = isActive ? "0 0 22px rgba(249,227,26,0.12)" : undefined;

  const clickable = !!onSelectIndex;

  const palette =
    step.kind === "call"
      ? "orange"
      : step.kind === "let"
        ? step.transitions?.length
          ? "yellow"
          : "blue"
        : "green";

  const title =
    step.kind === "call"
      ? `Call ${step.toAlgo}`
      : step.kind === "let"
        ? "Let"
        : step.kind === "return"
          ? "Return"
          : "Step";

  const detail = (() => {
    if (step.kind === "call") return `${step.args.length} arg(s)`;
    if (step.kind === "let") return step.hint ?? formatNodePath(step.nodePath as NodePath);
    if (step.kind === "return") return step.hint ?? formatSpecValue(step.value, 72);
    return undefined;
  })();

  const delta = getPrimaryEnvDelta(step);

  return (
    <Box pl={nodeDepth * 12}>
      {showConnector ? (
        <Box w="2px" h={10} bg={isActive ? "rgba(249,227,26,0.55)" : "rgba(38,38,38,1)"} mx="auto" />
      ) : null}
      <Card.Root
        size="sm"
        borderWidth="2px"
        borderColor={baseBorder}
        bg={baseBg}
        boxShadow={baseShadow}
        cursor={clickable ? "pointer" : undefined}
        onClick={clickable ? () => onSelectIndex?.(index) : undefined}
        w={{ base: "full", md: "520px" }}
        transition="background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease"
      >
        <Card.Header pb={2}>
          <HStack justify="space-between" gap={3} flexWrap="wrap">
            <HStack gap={2} flexWrap="wrap">
              <Tag.Root
                size="sm"
                variant="subtle"
                colorPalette={palette}
                bg={palette === "yellow" ? "rgba(249,227,26,0.14)" : undefined}
              >
                <Tag.Label>{title}</Tag.Label>
              </Tag.Root>
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
          {step.kind === "return" ? (
            <HStack gap={2} flexWrap="wrap" align="center">
              <Tag.Root size="sm" variant="outline" colorPalette="green">
                <Tag.Label>{step.value.type}</Tag.Label>
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
              <Tag.Root size="sm" variant="outline" colorPalette="gray">
                <Tag.Label>{delta.value.type}</Tag.Label>
              </Tag.Root>
              <Code>{formatSpecValue(delta.value, 84)}</Code>
            </HStack>
          ) : step.kind === "call" ? (
            <Text fontFamily="mono" fontSize="xs" opacity={0.9}>
              {step.toAlgo}({step.args.map((a) => formatSpecValue(a, 20)).join(", ")})
            </Text>
          ) : (
            <Text fontFamily="mono" fontSize="xs" opacity={0.85}>
              {detail ?? "—"}
            </Text>
          )}

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
