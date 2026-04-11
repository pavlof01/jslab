"use client";

import { Box, Card, Code, HStack, Tag, Text } from "@chakra-ui/react";

import type { TraceStep } from "@/app/abstract-functions-visualizer/spec-runner";
import { formatNodePath, formatSpecValue, type NodePath } from "@/app/abstract-functions-visualizer/traceModel";
import { getPrimaryEnvDelta } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/executionTreeUtils";
import { StepTransitions } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/StepTransitions";

type Props = {
  step: Extract<TraceStep, { kind: "call" | "let" | "return" }>;
  index: number;
  showConnector: boolean;
  nodeDepth: number;
  isActive: boolean;
  onSelectIndex?: (index: number) => void;
  callStep?: Extract<TraceStep, { kind: "call" }>;
};

export const TraceStepNode: React.FC<Props> = ({ step, index, showConnector, nodeDepth, isActive, onSelectIndex, callStep }) => {
  const clickable = !!onSelectIndex;

  const isAssert = !callStep && step.kind === "let" && !!step.hint && step.hint.includes("Assert");

  // Merged let+call nodes get the "call" orange colour so they visually read as "entering a sub-algo"
  const palette = isAssert
    ? "purple"
    : callStep
      ? "orange"
      : step.kind === "call"
        ? "orange"
        : step.kind === "let"
          ? step.transitions?.length ? "yellow" : "blue"
          : "green";


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
    purple: {
      border: isActive ? "#a78bfa" : "#7c5cbf",
      bg: isActive ? "rgba(167,139,250,0.1)" : "rgba(167,139,250,0.04)",
      shadow: isActive ? "0 0 20px rgba(167,139,250,0.15)" : "0 0 10px rgba(167,139,250,0.06)",
      leftBorder: "#a78bfa",
    },
  };

  const colors = colorMap[palette] || colorMap.blue;

  const algoName = callStep?.toAlgo ?? (step.kind === "call" ? step.toAlgo : undefined);
  const algoUrl = callStep?.specUrl ?? (step.kind === "call" ? step.specUrl : undefined);

  const letVarName = step.kind === "let" ? step.varName : undefined;
  const titleText = isAssert
    ? "Assert"
    : step.kind === "call"
      ? "Call"
      : step.kind === "let"
        ? "Let"
        : step.kind === "return"
          ? "Return"
          : "Step";

  const detail = (() => {
    if (isAssert) return undefined;
    // For merged nodes the hint moves into the body — nothing extra in the header
    if (callStep) return undefined;
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
          : palette === "purple"
            ? "0 0 24px rgba(167,139,250,0.25)"
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
        <Card.Header pb={callStep ? 1 : 2}>
          <HStack justify="space-between" gap={3} flexWrap="wrap">
            <HStack gap={2} flexWrap="wrap">
              <Tag.Root
                size="sm"
                variant={isActive ? "solid" : "outline"}
                colorPalette={palette === "purple" ? undefined : palette}
                style={palette === "purple" ? {
                  borderColor: "#a78bfa",
                  color: isActive ? "#fff" : "#a78bfa",
                  backgroundColor: isActive ? "#7c3aed" : "transparent",
                } : undefined}
              >
                <Tag.Label fontWeight={isActive ? "600" : "500"}>{titleText}</Tag.Label>
              </Tag.Root>
              {callStep ? (
                // Merged let+call: show "varName = AlgoLink" inline in header
                <HStack gap={1} fontFamily="mono" fontSize="xs">
                  {letVarName && (
                    <Text fontWeight="600" color={colors.leftBorder} opacity={0.9}>{letVarName}</Text>
                  )}
                  {letVarName && <Text opacity={0.5}>=</Text>}
                  {algoUrl ? (
                    <a href={algoUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ textDecoration: "none" }}>
                      <Text fontWeight="600" color={colors.leftBorder} opacity={0.9} _hover={{ textDecoration: "underline", opacity: 1 }}>
                        {callStep.toAlgo}
                      </Text>
                    </a>
                  ) : (
                    <Text fontWeight="600" color={colors.leftBorder} opacity={0.9}>{callStep.toAlgo}</Text>
                  )}
                </HStack>
              ) : (
                <>
                  {algoName && (
                    algoUrl ? (
                      <a href={algoUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ textDecoration: "none" }}>
                        <Text fontSize="xs" fontFamily="mono" fontWeight="600" color={colors.leftBorder} opacity={0.9} _hover={{ textDecoration: "underline", opacity: 1 }}>
                          {algoName}
                        </Text>
                      </a>
                    ) : (
                      <Text fontSize="xs" fontFamily="mono" fontWeight="600" color={colors.leftBorder} opacity={0.9}>
                        {algoName}
                      </Text>
                    )
                  )}
                  {step.kind === "return" && step.value.type !== "Undefined" && step.value.type !== "Null" && (
                    <Code fontSize="xs">{formatSpecValue(step.value, 60)}</Code>
                  )}
                </>
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
          {isAssert ? (
            <Text fontSize="xs" opacity={0.8} fontStyle="italic">
              {step.hint?.replace(/^Step\s+[\w.]+:\s+Assert\s*[—:]\s*/i, "") ?? step.hint}
            </Text>
          ) : callStep ? (
            // Merged let+call body: just the args
            <Text fontFamily="mono" fontSize="xs" opacity={0.75}>
              ({callStep.args.map((a) => formatSpecValue(a, 48)).join(", ")})
            </Text>
          ) : step.kind === "return" && step.value.type !== "Undefined" && step.value.type !== "Null" ? (
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

          {(step.kind === "let" || step.kind === "return") && step.transitions?.length ? (
            <StepTransitions transitions={step.transitions} />
          ) : null}
        </Card.Body>
      </Card.Root>
    </Box>
  );
};
