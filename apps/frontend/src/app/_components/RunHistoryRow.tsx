"use client";

import { Box, Flex, Text } from "@chakra-ui/react";

import type { RunHistoryEntry } from "@/lib/runHistory";
import { type EngineFlags, flagCount } from "@/lib/types";

export function relativeTime(then: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function flagSummary(flags: EngineFlags): string {
  const count = flagCount(flags);
  if (count === 0) return "";
  return ` · ${count} flag${count === 1 ? "" : "s"}`;
}

export function RunHistoryRow({
  entry,
  now,
  onRestore,
}: {
  entry: RunHistoryEntry;
  now: number;
  onRestore: () => void;
}) {
  return (
    <Box
      as="button"
      textAlign="left"
      onClick={onRestore}
      p={3}
      borderRadius="md"
      border="1px solid"
      borderColor="rule.row"
      _hover={{ borderColor: "accent", bg: "surface.hover" }}
    >
      <Flex justify="space-between" mb={1}>
        <Text fontSize="xs" color="accent">
          {entry.engines.join(", ")}
          {flagSummary(entry.flags)}
        </Text>
        <Text fontSize="xs" color="ink.5">
          {relativeTime(entry.ts, now)}
        </Text>
      </Flex>
      <Text
        textStyle="code"
        color="ink.body"
        lineClamp={2}
        whiteSpace="pre-wrap"
        wordBreak="break-all"
      >
        {entry.code.slice(0, 160) || "(empty)"}
      </Text>
    </Box>
  );
}
