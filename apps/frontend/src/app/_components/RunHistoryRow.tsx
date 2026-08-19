"use client";

import { Box, Flex, Text } from "@chakra-ui/react";

import type { RunHistoryEntry } from "@/lib/runHistory";

export function relativeTime(then: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function flagSummary(flags: string[]): string {
  if (flags.length === 0) return "";
  return ` · ${flags.length} flag${flags.length === 1 ? "" : "s"}`;
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
          {flagSummary(entry.v8Flags)}
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
