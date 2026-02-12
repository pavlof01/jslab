"use client";

import { HStack, Tag, Text } from "@chakra-ui/react";

export function CoercionMomentBanner({ transitionsCount }: { transitionsCount: number }) {
  return (
    <HStack justify="space-between" align="center" px={1}>
      <HStack gap={2}>
        <Tag.Root size="sm" colorPalette="yellow" variant="subtle">
          <Tag.Label>⚡ coercion</Tag.Label>
        </Tag.Root>
        <Tag.Root size="sm" colorPalette="yellow" variant="outline">
          <Tag.Label>{transitionsCount}</Tag.Label>
        </Tag.Root>
      </HStack>
      <Text fontSize="xs" opacity={0.75}>
        transition{transitionsCount === 1 ? "" : "s"} in this step
      </Text>
    </HStack>
  );
}

