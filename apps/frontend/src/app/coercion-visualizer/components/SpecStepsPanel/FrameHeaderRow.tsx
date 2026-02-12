"use client";

import { Box, Code, HStack, IconButton, Tag, Text } from "@chakra-ui/react";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";

export function FrameHeaderRow({
  frameId,
  algoId,
  title,
  depth,
  isCurrent,
  inStack,
  started,
  completed,
  isRoot,
  isExpanded,
  onToggleExpanded,
  onHeaderRef,
}: {
  frameId: string;
  algoId?: string;
  title: string;
  depth: number;
  isCurrent: boolean;
  inStack: boolean;
  started: boolean;
  completed: boolean;
  isRoot: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onHeaderRef: (el: HTMLDivElement | null) => void;
}) {
  const frameBorder = isCurrent ? "blue.solid" : inStack ? "gray.solid" : "border";
  const frameBg = isCurrent ? "blue.subtle" : "transparent";

  return (
    <Box
      ref={onHeaderRef}
      borderLeftWidth="3px"
      borderLeftColor={frameBorder}
      borderRadius="md"
      px={2}
      py={1}
      bg={frameBg}
    >
      <HStack justify="space-between" align="center" gap={3} flexWrap="wrap">
        <HStack gap={2} flexWrap="wrap">
          {depth > 0 ? (
            <Text fontSize="xs" opacity={0.8}>
              ↳
            </Text>
          ) : null}
          <Text fontSize="sm" fontFamily="mono">
            {title}
          </Text>
          {algoId ? (
            <Tag.Root size="sm" colorPalette="gray" variant="outline">
              <Tag.Label>{algoId}</Tag.Label>
            </Tag.Root>
          ) : null}
          <Text fontSize="xs" opacity={0.75}>
            <Code>{frameId}</Code>
          </Text>
        </HStack>
        <HStack gap={2}>
          {isCurrent ? (
            <Tag.Root size="sm" colorPalette="blue" variant="subtle">
              <Tag.Label>current</Tag.Label>
            </Tag.Root>
          ) : inStack ? (
            <Tag.Root size="sm" colorPalette="gray" variant="subtle">
              <Tag.Label>active</Tag.Label>
            </Tag.Root>
          ) : completed ? (
            <Tag.Root size="sm" colorPalette="gray" variant="outline">
              <Tag.Label>done</Tag.Label>
            </Tag.Root>
          ) : started ? (
            <Tag.Root size="sm" colorPalette="gray" variant="outline">
              <Tag.Label>started</Tag.Label>
            </Tag.Root>
          ) : null}

          <IconButton
            aria-label={isExpanded ? "Collapse frame" : "Expand frame"}
            size="xs"
            variant="outline"
            disabled={isRoot}
            onClick={onToggleExpanded}
          >
            {isExpanded ? <LuChevronDown /> : <LuChevronRight />}
          </IconButton>
        </HStack>
      </HStack>
    </Box>
  );
}

