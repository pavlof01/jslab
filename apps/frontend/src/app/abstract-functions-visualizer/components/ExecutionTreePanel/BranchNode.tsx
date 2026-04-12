"use client";

import { Box, Card, Code, HStack, Tag, Text } from "@chakra-ui/react";

import type { TraceStep } from "@/app/abstract-functions-visualizer/spec-runner";
import { formatNodePath, type NodePath } from "@/app/abstract-functions-visualizer/traceModel";
import { FaBan } from "react-icons/fa6";

type Props = {
  step: Extract<TraceStep, { kind: "if" }>;
  index: number;
  showConnector: boolean;
  nodeDepth: number;
  isActive: boolean;
  onSelectIndex?: (index: number) => void;
};

export const BranchNode: React.FC<Props> = ({ step, index, showConnector, nodeDepth, isActive, onSelectIndex }) => {
  const clickable = !!onSelectIndex;

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
};
