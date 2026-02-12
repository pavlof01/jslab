"use client";

import * as React from "react";
import { Box, Card, Code, Grid, HStack, Input, Separator, Tabs, Tag, Text, VStack } from "@chakra-ui/react";

import type { Algorithm, SpecValue } from "@/app/coercion-visualizer/spec-runner";
import { SPEC_VALUE_TYPE_PALETTE } from "@/app/coercion-visualizer/ui/palette";
import {
  formatSpecValue,
  type EnvSnapshot,
  type FlattenedEnvEntry,
  type TraceFrame,
} from "@/app/coercion-visualizer/traceModel";

function valueEquals(a: SpecValue | undefined, b: SpecValue | undefined): boolean {
  if (!a || !b) return false;
  if (a.type !== b.type) return false;
  return JSON.stringify(a.value) === JSON.stringify(b.value);
}

function isPrimitiveValue(v: SpecValue): boolean {
  return v.type !== "Object";
}

export function StatePanel({
  frames,
  visibleEnv,
  prevVisibleEnv,
  visibleDiffKeys,
  flattenedEnv,
  algoById,
}: {
  frames: TraceFrame[];
  visibleEnv: EnvSnapshot;
  prevVisibleEnv?: EnvSnapshot;
  visibleDiffKeys: string[];
  flattenedEnv: FlattenedEnvEntry[];
  algoById: Map<string, Algorithm>;
}) {
  const [view, setView] = React.useState<"visible" | "flattened">("visible");
  const [filter, setFilter] = React.useState("");
  const normalizedFilter = filter.trim().toLowerCase();

  const visibleEntries = React.useMemo(() => {
    const all = Object.entries(visibleEnv).sort(([a], [b]) => a.localeCompare(b));
    if (!normalizedFilter) return all;
    return all.filter(([name]) => name.toLowerCase().includes(normalizedFilter));
  }, [normalizedFilter, visibleEnv]);

  const flattenedEntries = React.useMemo(() => {
    const depthByFrameId = new Map(frames.map((f, idx) => [f.id, idx]));
    const all = [...flattenedEnv].sort((a, b) => {
      const da = depthByFrameId.get(a.frameId) ?? 0;
      const db = depthByFrameId.get(b.frameId) ?? 0;
      if (da !== db) return da - db;
      if (a.scope !== b.scope) return a.scope.localeCompare(b.scope);
      return a.name.localeCompare(b.name);
    });
    if (!normalizedFilter) return all;
    return all.filter(
      (e) => e.key.toLowerCase().includes(normalizedFilter) || e.name.toLowerCase().includes(normalizedFilter),
    );
  }, [flattenedEnv, frames, normalizedFilter]);

  const diffSet = React.useMemo(() => new Set(visibleDiffKeys), [visibleDiffKeys]);
  const currentFrameId = frames.length ? frames[frames.length - 1]?.id : undefined;

  return (
    <Card.Root size="sm" minH={0}>
      <Card.Header pb={2}>
        <VStack align="stretch" gap={2}>
          <HStack justify="space-between" gap={4}>
            <Text fontWeight="semibold">State</Text>
            <Text fontSize="xs" opacity={0.75}>
              vars: <Code>{Object.keys(visibleEnv).length}</Code> · frames: <Code>{frames.length}</Code>
            </Text>
          </HStack>

          <Input
            size="sm"
            placeholder="Filter variables (e.g. nx, t, arg)"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </VStack>
      </Card.Header>

      <Card.Body pt={2} minH={0}>
        <VStack align="stretch" gap={4} minH={0}>
          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={2}>
              Call Stack
            </Text>
            <VStack align="stretch" gap={2}>
              {frames.length === 0 ? (
                <Text fontSize="sm" opacity={0.7}>
                  No active stack.
                </Text>
              ) : (
                [...frames].reverse().map((frame, idx) => {
                  const algo = algoById.get(frame.algoId);
                  const title = algo?.title ?? frame.algoId;
                  const params = Object.entries(frame.params);
                  return (
                    <Box
                      key={frame.id}
                      borderWidth="1px"
                      borderRadius="md"
                      p={2}
                      bg={idx === 0 ? "bg.subtle" : "transparent"}
                    >
                      <HStack justify="space-between" align="start">
                        <Text fontSize="sm" fontFamily="mono">
                          {title}
                        </Text>
                        {idx === 0 ? (
                          <Tag.Root size="sm" colorPalette="blue" variant="subtle">
                            <Tag.Label>current</Tag.Label>
                          </Tag.Root>
                        ) : null}
                      </HStack>
                      <Text fontSize="xs" opacity={0.7} fontFamily="mono" mt={0.5}>
                        frame <Code>{frame.id}</Code>
                      </Text>
                      {params.length ? (
                        <Text fontSize="xs" opacity={0.8} mt={1}>
                          {params
                            .slice(0, 3)
                            .map(([k, v]) => `${k}=${formatSpecValue(v, 22)}`)
                            .join(", ")}
                          {params.length > 3 ? " …" : ""}
                        </Text>
                      ) : null}
                    </Box>
                  );
                })
              )}
            </VStack>
          </Box>

          <Separator />

          <Box minH={0}>
            <HStack justify="space-between" mb={2}>
              <Text fontSize="sm" fontWeight="semibold">
                Variables
              </Text>
              {visibleDiffKeys.length ? (
                <Text fontSize="xs" opacity={0.75}>
                  changed: <Code>{visibleDiffKeys.join(", ")}</Code>
                </Text>
              ) : (
                <Text fontSize="xs" opacity={0.6}>
                  no env changes
                </Text>
              )}
            </HStack>

            <HStack gap={2} flexWrap="wrap" mb={3}>
              <Text fontSize="xs" opacity={0.75}>
                Legend:
              </Text>
              <Tag.Root size="sm" variant="subtle" colorPalette="blue">
                <Tag.Label>Number</Tag.Label>
              </Tag.Root>
              <Tag.Root size="sm" variant="subtle" colorPalette="green">
                <Tag.Label>String</Tag.Label>
              </Tag.Root>
              <Tag.Root size="sm" variant="subtle" colorPalette="purple">
                <Tag.Label>Boolean</Tag.Label>
              </Tag.Root>
              <Tag.Root size="sm" variant="subtle" colorPalette="orange">
                <Tag.Label>Object</Tag.Label>
              </Tag.Root>
              <Tag.Root size="sm" variant="subtle" colorPalette="gray">
                <Tag.Label>Null/Undefined</Tag.Label>
              </Tag.Root>
            </HStack>

            <Tabs.Root
              value={view}
              onValueChange={(d) => setView((d.value as "visible" | "flattened") ?? "visible")}
              size="sm"
            >
              <Tabs.List>
                <Tabs.Trigger value="visible">Current frame</Tabs.Trigger>
                <Tabs.Trigger value="flattened">Flattened</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="visible">
                {visibleEntries.length === 0 ? (
                  <Text fontSize="sm" opacity={0.7} mt={3}>
                    No variables match the current filter.
                  </Text>
                ) : (
                  <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={3} mt={3}>
                    {visibleEntries.map(([name, v]) => {
                      const changed = diffSet.has(name);
                      const before = prevVisibleEnv?.[name];
                      const showBefore = changed && before && !valueEquals(before, v);
                      const beforeShort = before ? formatSpecValue(before, 18) : undefined;
                      const afterShort = formatSpecValue(v, 18);
                      const inlineDiff =
                        showBefore &&
                        before &&
                        isPrimitiveValue(before) &&
                        isPrimitiveValue(v) &&
                        !beforeShort?.includes("…") &&
                        !afterShort.includes("…");
                      return (
                        <Card.Root
                          key={name}
                          size="sm"
                          variant="subtle"
                          animation={changed ? "fade-in 300ms ease-out" : undefined}
                          borderWidth={changed ? "1px" : undefined}
                          borderColor={changed ? "blue.solid" : undefined}
                          boxShadow={changed ? "0 0 0 1px var(--chakra-colors-blue-solid)" : undefined}
                          transition="box-shadow 300ms ease, border-color 300ms ease"
                        >
                          <Card.Header pb={2}>
                            <HStack justify="space-between" align="start">
                              <Text fontFamily="mono" fontSize="sm">
                                {name}
                              </Text>
                              <Tag.Root size="sm" variant="subtle" colorPalette={SPEC_VALUE_TYPE_PALETTE[v.type] ?? "gray"}>
                                <Tag.Label>{v.type}</Tag.Label>
                              </Tag.Root>
                            </HStack>
                          </Card.Header>
                          <Card.Body pt={2}>
                            {inlineDiff && beforeShort ? (
                              <Text fontFamily="mono" fontSize="sm">
                                <Code>{beforeShort}</Code> → <Code>{afterShort}</Code>
                              </Text>
                            ) : (
                              <Text fontFamily="mono" fontSize="sm">
                                {formatSpecValue(v)}
                              </Text>
                            )}
                            {showBefore && before && !inlineDiff ? (
                              <Text fontSize="xs" opacity={0.75} mt={2}>
                                was: <Code>{formatSpecValue(before, 32)}</Code>
                              </Text>
                            ) : null}
                          </Card.Body>
                        </Card.Root>
                      );
                    })}
                  </Grid>
                )}
              </Tabs.Content>

              <Tabs.Content value="flattened">
                {flattenedEntries.length === 0 ? (
                  <Text fontSize="sm" opacity={0.7} mt={3}>
                    No variables match the current filter.
                  </Text>
                ) : (
                  <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={3} mt={3}>
                    {flattenedEntries.map((e) => {
                      const changed = e.frameId === currentFrameId && diffSet.has(e.name);
                      return (
                        <Card.Root
                          key={`${e.frameId}:${e.scope}:${e.name}`}
                          size="sm"
                          variant="subtle"
                          animation={changed ? "fade-in 300ms ease-out" : undefined}
                          borderWidth={changed ? "1px" : undefined}
                          borderColor={changed ? "blue.solid" : undefined}
                          boxShadow={changed ? "0 0 0 1px var(--chakra-colors-blue-solid)" : undefined}
                          transition="box-shadow 300ms ease, border-color 300ms ease"
                        >
                          <Card.Header pb={2}>
                            <VStack align="stretch" gap={1}>
                              <HStack justify="space-between" align="start">
                                <Text fontFamily="mono" fontSize="sm">
                                  {e.key}
                                </Text>
                                <Tag.Root size="sm" variant="subtle" colorPalette={SPEC_VALUE_TYPE_PALETTE[e.value.type] ?? "gray"}>
                                  <Tag.Label>{e.value.type}</Tag.Label>
                                </Tag.Root>
                              </HStack>
                              <HStack gap={2} flexWrap="wrap">
                                <Tag.Root size="sm" variant="outline">
                                  <Tag.Label>{e.scope}</Tag.Label>
                                </Tag.Root>
                                <Text fontSize="xs" opacity={0.75} fontFamily="mono">
                                  frame <Code>{e.frameId}</Code>
                                </Text>
                              </HStack>
                            </VStack>
                          </Card.Header>
                          <Card.Body pt={2}>
                            <Text fontFamily="mono" fontSize="sm">
                              {formatSpecValue(e.value)}
                            </Text>
                          </Card.Body>
                        </Card.Root>
                      );
                    })}
                  </Grid>
                )}
              </Tabs.Content>
            </Tabs.Root>
          </Box>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
