"use client";

import { Badge, Box, Flex, Stack, Text } from "@chakra-ui/react";
import { AlgorithmStep } from "../../types";

const accentPalette = ["#22d3ee", "#a855f7", "#f59e0b", "#10b981"];

function StepView({ step, depth = 0 }: { step: AlgorithmStep; depth?: number }) {
  const accent = accentPalette[depth % accentPalette.length];
  const hasChildren = Boolean(step.children?.length);
  const isError = step.status === "error";
  const isSpec = step.kind === "spec";

  return (
    <Box position="relative" pl={depth === 0 ? 0 : 8}>
      {depth > 0 && (
        <Box
          position="absolute"
          left={2}
          top={0}
          bottom={hasChildren ? 10 : 2}
          borderLeft="1px solid"
          borderColor="gray.700"
          opacity={0.6}
        />
      )}

      <Box
        borderRadius="md"
        borderWidth="1px"
        borderColor={isError ? "red.500" : "gray.700"}
        bgGradient={
          isError
            ? "linear(to-r, rgba(127,29,29,0.9), rgba(153,27,27,0.7))"
            : isSpec
              ? "linear(to-r, rgba(30,41,59,0.85), rgba(15,23,42,0.75))"
              : "linear(to-r, rgba(17,24,39,0.92), rgba(17,24,39,0.7))"
        }
        p={3}
        mb={2}
        shadow="md"
      >
        <Flex align="center" justify="space-between" gap={3}>
          <Badge
            fontSize="xs"
            px={2}
            py={1}
            borderRadius="full"
            color={accent}
            borderColor={accent}
            borderWidth="1px"
            bg="transparent"
          >
            Step {step.id}
          </Badge>
          <Flex gap={2} align="center">
            {step.kind && (
              <Badge fontSize="xs" px={2} py={1} borderRadius="full" bg="whiteAlpha.100" color="gray.200">
                {step.kind === "important" ? "important" : "spec"}
              </Badge>
            )}
            {hasChildren && (
              <Text fontSize="xs" color="gray.500">
                {step.children!.length} sub-step{step.children!.length > 1 ? "s" : ""}
              </Text>
            )}
          </Flex>
        </Flex>

        <Text fontSize="sm" fontWeight="semibold" color="gray.100" mt={2}>
          {step.title}
        </Text>

        {step.description && (
          <Text fontSize="xs" mt={1} color="gray.300">
            {step.description}
          </Text>
        )}

        {step.pre && (
          <Text fontSize="xs" mt={2} color="gray.400">
            before: {step.pre}
          </Text>
        )}
        {step.post && (
          <Text fontSize="xs" mt={1} color="teal.200">
            after: {step.post}
          </Text>
        )}
        {step.info && (
          <Text fontSize="xs" mt={2} color="gray.200">
            {step.info}
          </Text>
        )}
      </Box>

      {step.children && (
        <Stack gap={1} pl={4} borderLeft="1px dashed" borderColor="gray.800">
          {step.children.map((child) => (
            <StepView key={child.id} step={child} depth={depth + 1} />
          ))}
        </Stack>
      )}
    </Box>
  );
}

export function AlgorithmStepList({ steps }: { steps: AlgorithmStep[] }) {
  return (
    <Stack gap={3}>
      {steps.map((step) => (
        <StepView key={step.id} step={step} />
      ))}
    </Stack>
  );
}
