"use client";

import * as React from "react";
import { Box, Button, Code, Grid, HStack, Select, Tabs, Tag, Text, VStack, type ListCollection } from "@chakra-ui/react";

import type { Algorithm, SpecValue } from "@/app/coercion-visualizer/spec-runner";
import type { ExplorerTransition, TraceFrame } from "@/app/coercion-visualizer/traceModel";
import { formatSpecValue } from "@/app/coercion-visualizer/traceModel";
import type { Mode, Op, Preset } from "@/app/coercion-visualizer/model";
import { isUnary, PRESETS } from "@/app/coercion-visualizer/model";
import { SPEC_VALUE_TYPE_PALETTE } from "@/app/coercion-visualizer/ui/palette";
import { ValueEditorCard } from "@/app/coercion-visualizer/components/ValueEditorCard/ValueEditorCard";

export function ExplorerSidebar({
  error,
  mode,
  onModeChange,
  op,
  onOpChange,
  opCollection,
  x,
  onXChange,
  y,
  onYChange,
  algoCollection,
  exploreAlgoId,
  onExploreAlgoIdChange,
  exploreAlgo,
  exploreArgsByParam,
  onExploreArgChange,
  resultValue,
  traceLength,
  entryPreview,
  lastCoercion,
  currentFrames,
  algoById,
  onApplyPreset,
  panelBg,
  panelBorder,
  softSurfaceBgStrong,
}: {
  error: string | null;
  mode: Mode;
  onModeChange: (next: Mode) => void;
  op: Op;
  onOpChange: (next: Op) => void;
  opCollection: ListCollection<{ label: string; value: Op }>;
  x: SpecValue;
  onXChange: (next: SpecValue) => void;
  y: SpecValue;
  onYChange: (next: SpecValue) => void;
  algoCollection: ListCollection<{ label: string; value: string }>;
  exploreAlgoId: string;
  onExploreAlgoIdChange: (next: string) => void;
  exploreAlgo?: Algorithm;
  exploreArgsByParam: Record<string, SpecValue>;
  onExploreArgChange: (param: string, next: SpecValue) => void;
  resultValue?: SpecValue;
  traceLength: number;
  entryPreview: string;
  lastCoercion?: ExplorerTransition;
  currentFrames: TraceFrame[];
  algoById: Map<string, Algorithm>;
  onApplyPreset: (preset: Preset) => void;
  panelBg: string;
  panelBorder: string;
  softSurfaceBgStrong: string;
}) {
  return (
    <Box
      as="aside"
      borderRightWidth={{ base: "0px", lg: "1px" }}
      borderColor={panelBorder}
      bg={panelBg}
      p={4}
      overflow="auto"
      display="flex"
      flexDirection="column"
      gap={6}
    >
      {error ? (
        <Box borderWidth="1px" borderColor="red.solid" borderRadius="md" p={3} bg="red.subtle">
          <Text fontWeight="semibold" mb={1}>
            Runner error
          </Text>
          <Text fontSize="sm" opacity={0.9}>
            {error}
          </Text>
        </Box>
      ) : null}

      <Box>
        <HStack justify="space-between" align="center" gap={3} flexWrap="wrap" mb={3}>
          <Text fontSize="10px" fontWeight="black" textTransform="uppercase" letterSpacing="0.2em" opacity={0.65}>
            Input Operands
          </Text>
          <Tabs.Root
            value={mode}
            onValueChange={(d) => onModeChange((d.value as Mode) ?? "coercion")}
            size="sm"
            variant="enclosed"
          >
            <Tabs.List>
              <Tabs.Trigger value="coercion">Coercion</Tabs.Trigger>
              <Tabs.Trigger value="algorithm">Algorithm</Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        </HStack>

        <VStack align="stretch" gap={4}>
          {mode === "coercion" ? (
            <>
              <Box>
                <Text fontSize="xs" opacity={0.75} mb={1}>
                  Operation
                </Text>
                <Select.Root
                  size="sm"
                  collection={opCollection}
                  value={[op]}
                  onValueChange={(details) => {
                    const next = details.value[0] as Op | undefined;
                    if (next) onOpChange(next);
                  }}
                >
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="Operation" />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Select.Positioner>
                    <Select.Content>
                      {opCollection.items.map((item) => (
                        <Select.Item key={item.value} item={item}>
                          <Select.ItemText>{item.label}</Select.ItemText>
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Select.Root>
              </Box>

              <VStack align="stretch" gap={3}>
                <ValueEditorCard label="Left Hand Side (x)" value={x} onChange={onXChange} />
                {isUnary(op) ? null : (
                  <>
                    <HStack justify="center" py={1}>
                      <Text fontSize="xs" opacity={0.5} fontFamily="mono">
                        ⇅
                      </Text>
                    </HStack>
                    <ValueEditorCard label="Right Hand Side (y)" value={y} onChange={onYChange} />
                  </>
                )}
              </VStack>
            </>
          ) : (
            <>
              <Box>
                <Text fontSize="xs" opacity={0.75} mb={1}>
                  Algorithm
                </Text>
                <Select.Root
                  size="sm"
                  collection={algoCollection}
                  value={[exploreAlgoId]}
                  onValueChange={(details) => {
                    const next = details.value[0];
                    if (next) onExploreAlgoIdChange(next);
                  }}
                >
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="Algorithm" />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Select.Positioner>
                    <Select.Content>
                      {algoCollection.items.map((item) => (
                        <Select.Item key={item.value} item={item}>
                          <Select.ItemText>{item.label}</Select.ItemText>
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Select.Root>
                {exploreAlgo ? (
                  <Text fontSize="xs" opacity={0.75} mt={2}>
                    id: <Code>{exploreAlgo.id}</Code> · params: <Code>{exploreAlgo.params.length}</Code> · locals:{" "}
                    <Code>{exploreAlgo.locals?.length ?? 0}</Code>
                  </Text>
                ) : null}
              </Box>

              {exploreAlgo ? (
                <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={3}>
                  {exploreAlgo.params.length ? (
                    exploreAlgo.params.map((p) => (
                      <ValueEditorCard
                        key={p}
                        label={p}
                        value={exploreArgsByParam[p] ?? { type: "Undefined", value: undefined }}
                        onChange={(next) => onExploreArgChange(p, next)}
                      />
                    ))
                  ) : (
                    <Box>
                      <Text fontSize="sm" opacity={0.8}>
                        This algorithm has no parameters.
                      </Text>
                    </Box>
                  )}
                </Grid>
              ) : (
                <Text fontSize="sm" opacity={0.8}>
                  Unknown algorithm id.
                </Text>
              )}
            </>
          )}
        </VStack>
      </Box>

      <Box>
        <Text fontSize="10px" fontWeight="black" textTransform="uppercase" letterSpacing="0.2em" opacity={0.65} mb={3}>
          Live State
        </Text>

        <Box borderRadius="xl" bg={softSurfaceBgStrong} borderWidth="1px" borderColor={panelBorder} p={4}>
          <VStack align="stretch" gap={4}>
            {mode === "coercion" ? (
              <VStack align="stretch" gap={2}>
                <HStack
                  justify="space-between"
                  align="center"
                  p={2}
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor={panelBorder}
                >
                  <Text fontSize="xs" opacity={0.75} fontWeight="bold">
                    Type(x)
                  </Text>
                  <Tag.Root size="sm" variant="subtle" colorPalette={SPEC_VALUE_TYPE_PALETTE[x.type] ?? "gray"}>
                    <Tag.Label>{x.type}</Tag.Label>
                  </Tag.Root>
                </HStack>
                {!isUnary(op) ? (
                  <HStack
                    justify="space-between"
                    align="center"
                    p={2}
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor={panelBorder}
                  >
                    <Text fontSize="xs" opacity={0.75} fontWeight="bold">
                      Type(y)
                    </Text>
                    <Tag.Root size="sm" variant="subtle" colorPalette={SPEC_VALUE_TYPE_PALETTE[y.type] ?? "gray"}>
                      <Tag.Label>{y.type}</Tag.Label>
                    </Tag.Root>
                  </HStack>
                ) : null}
              </VStack>
            ) : null}

            <Box>
              <Text fontSize="xs" opacity={0.75} fontWeight="black" letterSpacing="widest" textTransform="uppercase">
                Result
              </Text>
              <Text fontFamily="mono" fontSize="sm" mt={2}>
                {resultValue ? (
                  <Code>
                    {resultValue.type}({formatSpecValue(resultValue)})
                  </Code>
                ) : (
                  <Code>—</Code>
                )}{" "}
                · trace <Code>{traceLength}</Code>
              </Text>
              <Text fontSize="xs" opacity={0.75} mt={2}>
                {mode === "coercion" ? "Expression" : "Call"}: <Code>{entryPreview}</Code>
              </Text>
            </Box>

            {lastCoercion ? (
              <Box>
                <Text fontSize="xs" opacity={0.75} fontWeight="black" letterSpacing="widest" textTransform="uppercase">
                  Last Coercion
                </Text>
                <HStack
                  justify="space-between"
                  align="center"
                  mt={2}
                  p={2}
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor="rgba(249,227,26,0.25)"
                  bg="rgba(249,227,26,0.06)"
                >
                  <Text fontSize="xs" opacity={0.85} fontStyle="italic">
                    {lastCoercion.label}
                  </Text>
                  <Tag.Root size="sm" variant="subtle" colorPalette="yellow">
                    <Tag.Label>{lastCoercion.after ? formatSpecValue(lastCoercion.after, 18) : "—"}</Tag.Label>
                  </Tag.Root>
                </HStack>
              </Box>
            ) : null}

            <Box pt={4} borderTopWidth="1px" borderTopColor="rgba(38,38,38,1)">
              <Text
                fontSize="xs"
                opacity={0.75}
                fontWeight="black"
                letterSpacing="widest"
                textTransform="uppercase"
                mb={2}
              >
                Execution Stack
              </Text>
              <VStack align="stretch" gap={2}>
                {currentFrames.length === 0 ? (
                  <Text fontSize="sm" opacity={0.7}>
                    No active stack.
                  </Text>
                ) : (
                  [...currentFrames].reverse().slice(0, 6).map((frame, idx) => {
                    const algo = algoById.get(frame.algoId);
                    const title = algo?.title ?? frame.algoId;
                    const isTop = idx === 0;
                    return (
                      <HStack
                        key={frame.id}
                        gap={3}
                        p={2}
                        borderRadius="lg"
                        bg={isTop ? "rgba(249,227,26,0.06)" : "transparent"}
                        borderWidth={isTop ? "1px" : "0px"}
                        borderColor={isTop ? "rgba(249,227,26,0.20)" : "transparent"}
                        opacity={isTop ? 1 : 0.6}
                      >
                        <Box boxSize="8px" borderRadius="full" bg={isTop ? "#f9e31a" : "rgba(71,85,105,1)"} />
                        <Text fontFamily="mono" fontSize="xs">
                          {title}
                        </Text>
                      </HStack>
                    );
                  })
                )}
              </VStack>
            </Box>
          </VStack>
        </Box>
      </Box>

      {mode === "coercion" ? (
        <Box mt="auto">
          <Text fontSize="10px" fontWeight="black" textTransform="uppercase" letterSpacing="0.2em" opacity={0.65} mb={3}>
            Presets
          </Text>
          <HStack gap={2} flexWrap="wrap">
            {PRESETS.map((p) => (
              <Button key={p.label} size="xs" variant="outline" onClick={() => onApplyPreset(p)}>
                {p.label}
              </Button>
            ))}
          </HStack>
        </Box>
      ) : null}
    </Box>
  );
}

