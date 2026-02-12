"use client";

import type { MutableRefObject } from "react";
import { Box, Code, Collapsible, HStack, IconButton, Tag, Text, VStack } from "@chakra-ui/react";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";

import type { Algorithm, TraceStep } from "@/app/coercion-visualizer/spec-runner";
import { formatSpecValue, type NodePath } from "@/app/coercion-visualizer/traceModel";
import { flattenInstrs, getLinePalette, type SpecLine } from "@/app/coercion-visualizer/components/SpecStepsPanel/specStepsUtils";

export function SpecLineRow({
  line,
  frameId,
  algoId,
  displayNo,
  execStep,
  isDone,
  isActive,
  transitionsCount,
  branchBadge,
  showDetails,
  calls,
  callToggleKey,
  isCallOpen,
  onToggleCallKey,
  rowOpacity,
  onHoverStepIndex,
  resolveFrameStepIndex,
  activeRowRef,
  algoById,
}: {
  line: SpecLine;
  frameId: string;
  algoId?: string;
  displayNo?: number;
  execStep?: TraceStep;
  isDone: boolean;
  isActive: boolean;
  transitionsCount: number;
  branchBadge?: "then" | "else";
  showDetails: boolean;
  calls: string[];
  callToggleKey: string;
  isCallOpen: boolean;
  onToggleCallKey: (key: string) => void;
  rowOpacity: number;
  onHoverStepIndex?: (index: number | undefined) => void;
  resolveFrameStepIndex: (frameId: string, algoId: string, nodePath?: NodePath) => number | undefined;
  activeRowRef: MutableRefObject<HTMLDivElement | null>;
  algoById: Map<string, Algorithm>;
}) {
  const palette = getLinePalette(line);
  const isMoment = isActive && transitionsCount > 0;
  const linePadding = (line.indent ?? 0) * 10;
  const lineExplain = showDetails && line.kind === "instr" ? line.instr?.meta?.ui?.explain : undefined;

  const description = showDetails
    ? (() => {
        if (!execStep || line.kind !== "instr" || !line.instr) return undefined;
        if ((execStep.frameId ?? "legacy") !== frameId) return undefined;

        if (line.instr.op === "let" && execStep.kind === "let") {
          const v = execStep.envDelta[line.instr.name];
          if (!v) return undefined;
          const tCount = execStep.transitions?.length ?? 0;
          return (
            <HStack gap={2} flexWrap="wrap">
              <Text fontSize="xs" opacity={0.7}>
                set
              </Text>
              <Code fontSize="xs">{line.instr.name}</Code>
              <Text fontSize="xs" opacity={0.7}>
                ←
              </Text>
              <Tag.Root size="sm" variant="subtle" colorPalette="gray">
                <Tag.Label>{v.type}</Tag.Label>
              </Tag.Root>
              <Code fontSize="xs">{formatSpecValue(v, 72)}</Code>
              {tCount ? (
                <Tag.Root size="sm" variant="subtle" colorPalette="yellow">
                  <Tag.Label>⚡ {tCount}</Tag.Label>
                </Tag.Root>
              ) : null}
            </HStack>
          );
        }

        if (line.instr.op === "if" && execStep.kind === "if") {
          return (
            <VStack align="start" gap={1}>
              {execStep.condPretty ? (
                <HStack gap={2} flexWrap="wrap">
                  <Text fontSize="xs" opacity={0.7}>
                    cond
                  </Text>
                  <Code fontSize="xs">{execStep.condPretty}</Code>
                </HStack>
              ) : null}
              <HStack gap={2} flexWrap="wrap">
                <Tag.Root size="sm" colorPalette="purple" variant="subtle">
                  <Tag.Label>{execStep.decision.taken}</Tag.Label>
                </Tag.Root>
                <Text fontSize="xs" opacity={0.85}>
                  {execStep.decision.why}
                </Text>
              </HStack>
            </VStack>
          );
        }

        if (line.instr.op === "return" && execStep.kind === "return") {
          const tCount = execStep.transitions?.length ?? 0;
          return (
            <HStack gap={2} flexWrap="wrap">
              <Text fontSize="xs" opacity={0.7}>
                return
              </Text>
              <Tag.Root size="sm" variant="subtle" colorPalette="gray">
                <Tag.Label>{execStep.value.type}</Tag.Label>
              </Tag.Root>
              <Code fontSize="xs">{formatSpecValue(execStep.value, 72)}</Code>
              {tCount ? (
                <Tag.Root size="sm" variant="subtle" colorPalette="yellow">
                  <Tag.Label>⚡ {tCount}</Tag.Label>
                </Tag.Root>
              ) : null}
            </HStack>
          );
        }

        return undefined;
      })()
    : undefined;

  return (
    <Box opacity={rowOpacity}>
      <HStack
        ref={(el: HTMLDivElement | null) => {
          if (isActive) activeRowRef.current = el;
        }}
        onMouseEnter={() => {
          if (!algoId || line.kind !== "instr") return;
          const resolved = resolveFrameStepIndex(frameId, algoId, line.nodePath);
          if (resolved === undefined) return;
          onHoverStepIndex?.(resolved);
        }}
        onMouseLeave={() => {
          onHoverStepIndex?.(undefined);
        }}
        align="start"
        gap={3}
        px={2}
        py={1}
        borderRadius="md"
        bg={isActive ? "rgba(249,227,26,0.08)" : "transparent"}
        borderLeftWidth={isActive ? "3px" : "0px"}
        borderLeftColor={isActive ? "#f9e31a" : "transparent"}
        transition="background-color 120ms ease, border-color 120ms ease"
      >
        <HStack gap={2} minW="92px" justify="flex-end" align="start">
          <Box
            w="3px"
            h="18px"
            borderRadius="full"
            mt="2px"
            bg={line.kind === "instr" ? `${palette}.solid` : "gray.solid"}
            opacity={line.kind === "instr" ? 0.9 : 0.35}
          />
          <Box
            boxSize="7px"
            borderRadius="full"
            mt="6px"
            bg="yellow.solid"
            opacity={line.kind === "instr" && isMoment ? 1 : 0}
            transition="opacity 120ms ease"
          />
          {displayNo ? (
            <Text fontSize="xs" opacity={0.65} minW="28px" textAlign="right">
              {displayNo}
            </Text>
          ) : (
            <Box minW="28px" />
          )}
        </HStack>

        <VStack align="stretch" gap={1} flex="1" minW={0}>
          <HStack gap={2} align="start" flexWrap="wrap">
            {line.kind === "branch" ? (
              <Box pl={linePadding} flex="1" minW={0}>
                <Tag.Root size="sm" colorPalette="purple" variant="subtle">
                  <Tag.Label>{line.text}</Tag.Label>
                </Tag.Root>
              </Box>
            ) : (
              <Text
                fontSize="sm"
                fontFamily="mono"
                whiteSpace="pre-wrap"
                pl={linePadding}
                opacity={1}
                flex="1"
                minW={0}
              >
                {line.text}
              </Text>
            )}

            {isActive && branchBadge && line.instr?.op === "if" ? (
              <Tag.Root size="sm" colorPalette="purple" variant="subtle">
                <Tag.Label>branch: {branchBadge}</Tag.Label>
              </Tag.Root>
            ) : null}

            {isActive && transitionsCount ? (
              <Tag.Root size="sm" colorPalette="yellow" variant="subtle">
                <Tag.Label>coercion</Tag.Label>
              </Tag.Root>
            ) : null}

            {calls.length ? (
              <Tag.Root size="sm" colorPalette="orange" variant="subtle">
                <Tag.Label>call</Tag.Label>
              </Tag.Root>
            ) : null}

            {calls.length ? (
              <IconButton
                aria-label="Toggle nested call view"
                size="xs"
                variant="outline"
                onClick={() => onToggleCallKey(callToggleKey)}
              >
                {isCallOpen ? <LuChevronDown /> : <LuChevronRight />}
              </IconButton>
            ) : null}
          </HStack>

          {description || lineExplain ? (
            <Box pl={linePadding}>
              {description ? (
                <Box mt={0.5} opacity={isDone && !isActive ? 0.85 : 0.95}>
                  {description}
                </Box>
              ) : null}
              {lineExplain ? (
                <Text fontSize="xs" opacity={0.75} mt={0.5}>
                  {lineExplain}
                </Text>
              ) : null}
            </Box>
          ) : null}
        </VStack>
      </HStack>

      {calls.length ? (
        <Collapsible.Root open={isCallOpen}>
          <Collapsible.Content>
            <Box mt={1} ml="92px" pl={2} borderLeftWidth="2px" borderLeftColor="orange.solid">
              <VStack align="stretch" gap={2} py={2}>
                {calls.map((callAlgoId) => {
                  const called = algoById.get(callAlgoId);
                  const innerLines = called ? flattenInstrs(called.body, [], 1) : [];
                  return (
                    <Box key={callAlgoId} borderWidth="1px" borderRadius="md" p={2} bg="bg.subtle">
                      <HStack justify="space-between" align="start" gap={3} flexWrap="wrap">
                        <Text fontSize="xs" fontFamily="mono">
                          ↳ {called?.title ?? callAlgoId}
                        </Text>
                        <Tag.Root size="sm" colorPalette="orange" variant="outline">
                          <Tag.Label>{callAlgoId}</Tag.Label>
                        </Tag.Root>
                      </HStack>
                      {called ? (
                        <VStack align="stretch" gap={1} mt={2}>
                          {innerLines.length ? (
                            <>
                              {innerLines.slice(0, 24).map((l, innerIdx) => (
                                <Text
                                  key={`${callAlgoId}:${innerIdx}:${l.text}`}
                                  fontSize="xs"
                                  fontFamily="mono"
                                  opacity={l.kind === "branch" ? 0.75 : 0.9}
                                  pl={(line.indent + l.indent) * 10}
                                  whiteSpace="pre-wrap"
                                >
                                  {l.text}
                                </Text>
                              ))}
                              {innerLines.length > 24 ? (
                                <Text fontSize="xs" opacity={0.7}>
                                  … {innerLines.length - 24} more line(s)
                                </Text>
                              ) : null}
                            </>
                          ) : (
                            <Text fontSize="xs" opacity={0.75}>
                              No steps.
                            </Text>
                          )}
                        </VStack>
                      ) : (
                        <Text fontSize="xs" opacity={0.75} mt={2}>
                          Unknown algorithm id.
                        </Text>
                      )}
                    </Box>
                  );
                })}
              </VStack>
            </Box>
          </Collapsible.Content>
        </Collapsible.Root>
      ) : null}
    </Box>
  );
}
