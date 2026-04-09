"use client";

import { Box, Card, Code, HStack, Tag, Text, VStack } from "@chakra-ui/react";

import type { Algorithm, TraceStep } from "@/app/abstract-functions-visualizer/spec-runner";
import { getInstrAtPath } from "@/app/abstract-functions-visualizer/lib/algoIr";
import { formatNodePath, type NodePath } from "@/app/abstract-functions-visualizer/traceModel";
import { summarizeBranch } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/executionTreeUtils";
import { FaBan, FaCheck, FaBolt } from "react-icons/fa6";

type Props = {
  step: Extract<TraceStep, { kind: "if" }>;
  index: number;
  showConnector: boolean;
  nodeDepth: number;
  isActive: boolean;
  algoById: Map<string, Algorithm>;
  onSelectIndex?: (index: number) => void;
};

export const BranchNode: React.FC<Props> = ({ step, index, showConnector, nodeDepth, isActive, algoById, onSelectIndex }) => {
  const clickable = !!onSelectIndex;

  const algo = algoById.get(step.algoId);
  const instr = algo ? getInstrAtPath(algo, step.nodePath as NodePath) : undefined;
  const hasElse = instr && instr.op === "if" && instr.else && Object.keys(instr.else).length > 0;
  const thenSummary = instr && instr.op === "if" ? summarizeBranch(instr.then) : "—";
  const elseSummary = instr && instr.op === "if" ? summarizeBranch(instr.else) : "—";
  const taken = step.decision.taken;

  // If there's no else branch, display as simple node with "Skipped" indicator
  if (!hasElse) {
    return (
      <Box pl={nodeDepth * 12}>
        {showConnector ? <Box w="2px" h={10} bg="#2d2d2d" mx="auto" /> : null}
        <Card.Root
          size="sm"
          borderWidth="1px"
          borderColor="#3d3d3d"
          bg="rgba(26,26,26,0.95)"
          boxShadow={isActive ? "0 0 12px rgba(255,159,64,0.15)" : undefined}
          cursor={clickable ? "pointer" : undefined}
          onClick={clickable ? () => onSelectIndex?.(index) : undefined}
          w={{ base: "full", md: "520px" }}
          transition="all 140ms ease"
          borderLeftWidth="4px"
          borderLeftColor="#d4a574"
          borderRadius="0.5rem"
          _hover={clickable ? { boxShadow: "0 0 16px rgba(255,159,64,0.25)" } : undefined}
        >
          <Card.Header pb={2}>
            <HStack justify="space-between" gap={3} flexWrap="wrap">
              <HStack gap={2} alignItems="center">
                <Tag.Root size="sm" variant="subtle" colorPalette="blue">
                  <Tag.Label>If</Tag.Label>
                </Tag.Root>
                <Tag.Root size="sm" variant="outline" colorPalette="orange">
                  <FaBan size={11} style={{ marginRight: "3px" }} />
                  <Tag.Label fontWeight="600" fontSize="xs">
                    Skipped
                  </Tag.Label>
                </Tag.Root>
              </HStack>
              <Text fontSize="xs" opacity={0.7} fontFamily="mono">
                <Code>#{index + 1}</Code>
              </Text>
            </HStack>
          </Card.Header>
          <Card.Body pt={0}>
            <Text fontFamily="mono" fontSize="xs" opacity={0.9}>
              {step.hint ?? step.condPretty ?? `If (${formatNodePath(step.nodePath as NodePath)}) …`}
            </Text>
            {step.decision.why ? (
              <Text fontSize="xs" opacity={0.7} mt={2}>
                {step.decision.why}
              </Text>
            ) : null}
          </Card.Body>
        </Card.Root>
      </Box>
    );
  }

  return (
    <Box pl={nodeDepth * 12}>
      {showConnector ? <Box w="2px" h={10} bg="#2d2d2d" mx="auto" /> : null}
      <VStack align="center" gap={3}>
        <Card.Root
          size="sm"
          w={{ base: "full", md: "440px" }}
          borderWidth="2px"
          borderColor="#3b82f6"
          bg="rgba(59,130,246,0.06)"
          boxShadow="0 0 16px rgba(59,130,246,0.15)"
          cursor={clickable ? "pointer" : undefined}
          onClick={clickable ? () => onSelectIndex?.(index) : undefined}
          transition="all 140ms ease"
          borderLeftWidth="4px"
          borderLeftColor="#3b82f6"
          borderRadius="0.5rem"
          _hover={clickable ? { boxShadow: "0 0 20px rgba(59,130,246,0.25)" } : undefined}
        >
          <Card.Header pb={2}>
            <HStack justify="space-between" gap={3} flexWrap="wrap">
              <HStack gap={2}>
                <Tag.Root size="sm" variant="solid" colorPalette="blue">
                  <FaBolt size={11} style={{ marginRight: "3px" }} />
                  <Tag.Label>If</Tag.Label>
                </Tag.Root>
                <Text fontSize="xs" opacity={0.6} fontFamily="mono">
                  <Code>#{index + 1}</Code>
                </Text>
              </HStack>
            </HStack>
          </Card.Header>
          <Card.Body pt={0}>
            <Text fontFamily="mono" fontSize="xs" opacity={0.9}>
              {step.hint ?? step.condPretty ?? `If (${formatNodePath(step.nodePath as NodePath)}) …`}
            </Text>
            {step.decision.why ? (
              <Text fontSize="xs" opacity={0.7} mt={2}>
                {step.decision.why}
              </Text>
            ) : null}
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
                borderWidth={active ? "2px" : "1px"}
                borderColor={active ? "#f9e31a" : "#3d3d3d"}
                bg={active ? "rgba(249,227,26,0.08)" : "rgba(26,26,26,0.85)"}
                boxShadow={active ? "0 0 16px rgba(249,227,26,0.2)" : undefined}
                opacity={active ? 1 : 0.6}
                transition="all 140ms ease"
                borderLeftWidth={active ? "4px" : "3px"}
                borderLeftColor={active ? "#f9e31a" : "#555"}
                borderRadius="0.5rem"
                _hover={
                  clickable
                    ? { boxShadow: active ? "0 0 20px rgba(249,227,26,0.3)" : "0 0 12px rgba(85,85,85,0.3)" }
                    : undefined
                }
              >
                <Card.Body>
                  <HStack justify="space-between" gap={3} align="start" mb={1}>
                    <Tag.Root size="sm" variant={active ? "solid" : "subtle"} colorPalette={active ? "yellow" : "gray"}>
                      {active && <FaCheck size={10} style={{ marginRight: "3px" }} />}
                      <Tag.Label fontWeight={active ? "600" : "500"}>{branch === "then" ? "THEN" : "ELSE"}</Tag.Label>
                    </Tag.Root>
                    {active ? (
                      <Tag.Root size="sm" variant="outline" colorPalette="green">
                        <Tag.Label>✓ ACTIVE</Tag.Label>
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
};
