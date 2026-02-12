"use client";

import { Box, Card, HStack, Tag, Text, VStack } from "@chakra-ui/react";

import type { Algorithm, TraceStep } from "@/app/coercion-visualizer/spec-runner";
import { getInstrAtPath } from "@/app/coercion-visualizer/lib/algoIr";
import { formatNodePath, type NodePath } from "@/app/coercion-visualizer/traceModel";
import { summarizeBranch } from "@/app/coercion-visualizer/components/ExecutionTreePanel/executionTreeUtils";

export function BranchNode({
  step,
  index,
  showConnector,
  nodeDepth,
  isActive,
  algoById,
  onSelectIndex,
}: {
  step: Extract<TraceStep, { kind: "if" }>;
  index: number;
  showConnector: boolean;
  nodeDepth: number;
  isActive: boolean;
  algoById: Map<string, Algorithm>;
  onSelectIndex?: (index: number) => void;
}) {
  const clickable = !!onSelectIndex;

  const algo = algoById.get(step.algoId);
  const instr = algo ? getInstrAtPath(algo, step.nodePath as NodePath) : undefined;
  const thenSummary = instr && instr.op === "if" ? summarizeBranch(instr.then) : "—";
  const elseSummary = instr && instr.op === "if" ? summarizeBranch(instr.else) : "—";
  const taken = step.decision.taken;

  return (
    <Box pl={nodeDepth * 12}>
      {showConnector ? <Box w="2px" h={10} bg="rgba(38,38,38,1)" mx="auto" /> : null}
      <VStack align="center" gap={3}>
        <Card.Root
          size="sm"
          w={{ base: "full", md: "440px" }}
          borderWidth="2px"
          borderColor={isActive ? "rgba(59,130,246,0.55)" : "rgba(59,130,246,0.22)"}
          bg={isActive ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.04)"}
          boxShadow={isActive ? "0 0 18px rgba(59,130,246,0.10)" : undefined}
          cursor={clickable ? "pointer" : undefined}
          onClick={clickable ? () => onSelectIndex?.(index) : undefined}
        >
          <Card.Header pb={2}>
            <HStack justify="space-between" gap={3} flexWrap="wrap">
              <Text
                fontSize="9px"
                fontWeight="black"
                letterSpacing="widest"
                textTransform="uppercase"
                color="rgba(96,165,250,0.95)"
              >
                Step #{index + 1}: Branch
              </Text>
              <Tag.Root size="sm" variant="subtle" colorPalette="purple">
                <Tag.Label>{taken}</Tag.Label>
              </Tag.Root>
            </HStack>
          </Card.Header>
          <Card.Body pt={0}>
            <Text fontFamily="mono" fontSize="xs" opacity={0.9}>
              {step.hint ?? step.condPretty ?? `If (${formatNodePath(step.nodePath as NodePath)}) …`}
            </Text>
            <Text fontSize="xs" opacity={0.7} mt={2}>
              {step.decision.why}
            </Text>
          </Card.Body>
        </Card.Root>

        <HStack gap={3} w={{ base: "full", md: "520px" }} align="stretch">
          {(["then", "else"] as const).map((branch) => {
            const active = taken === branch;
            const summary = branch === "then" ? thenSummary : elseSummary;
            return (
              <Card.Root
                key={branch}
                size="sm"
                flex="1"
                borderWidth="2px"
                borderColor={active ? "#f9e31a" : "rgba(38,38,38,1)"}
                bg={active ? "rgba(249,227,26,0.06)" : "rgba(20,20,20,0.30)"}
                opacity={active ? 1 : 0.35}
                filter={active ? "none" : "grayscale(1)"}
                transform={active ? "scale(1)" : "scale(0.98)"}
                transition="opacity 140ms ease, transform 140ms ease"
              >
                <Card.Body>
                  <HStack justify="space-between" gap={3} align="start">
                    <Tag.Root size="sm" variant="subtle" colorPalette={active ? "yellow" : "gray"}>
                      <Tag.Label>{branch}</Tag.Label>
                    </Tag.Root>
                    {active ? (
                      <Tag.Root size="sm" variant="outline" colorPalette="green">
                        <Tag.Label>MATCHED</Tag.Label>
                      </Tag.Root>
                    ) : null}
                  </HStack>
                  <Text fontFamily="mono" fontSize="xs" mt={2} opacity={0.9}>
                    {summary}
                  </Text>
                </Card.Body>
              </Card.Root>
            );
          })}
        </HStack>
      </VStack>
    </Box>
  );
}

