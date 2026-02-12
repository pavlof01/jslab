"use client";

import * as React from "react";
import { Box, Button, Card, Code, HStack, Separator, Tag, Text, VStack } from "@chakra-ui/react";

import type { Algorithm } from "@/app/coercion-visualizer/spec-runner";
import {
  formatNodePath,
  formatSpecValue,
  type FrameTree,
  type ExplorerTransition,
  TransitionKind,
} from "@/app/coercion-visualizer/traceModel";

const kindPalette: Record<TransitionKind, string> = {
  [TransitionKind.Coercion]: "yellow",
  [TransitionKind.Concatenation]: "green",
  [TransitionKind.NumericAddition]: "blue",
  [TransitionKind.BranchDecision]: "purple",
  [TransitionKind.ReturnValue]: "green",
};

function TransitionHeader({ t }: { t: ExplorerTransition }) {
  const palette = kindPalette[t.kind] ?? "gray";
  return (
    <HStack justify="space-between" align="start" gap={3}>
      <Tag.Root size="sm" colorPalette={palette} variant="subtle">
        <Tag.Label>{t.kind}</Tag.Label>
      </Tag.Root>
      <Text fontSize="xs" opacity={0.75} fontFamily="mono">
        step #{t.stepIndex + 1}
      </Text>
    </HStack>
  );
}

function TransitionBody({ t }: { t: ExplorerTransition }) {
  if (t.kind === TransitionKind.Coercion) {
    return (
      <VStack align="stretch" gap={2}>
        <HStack gap={2} align="center" flexWrap="wrap">
          <Tag.Root size="sm" variant="outline" colorPalette="yellow">
            <Tag.Label>{t.before && !Array.isArray(t.before) ? t.before.type : "—"}</Tag.Label>
          </Tag.Root>
          <Code>{t.before && !Array.isArray(t.before) ? formatSpecValue(t.before) : "—"}</Code>
          <Text opacity={0.8}>→</Text>
          <Tag.Root size="sm" variant="outline" colorPalette="yellow">
            <Tag.Label>{t.after ? t.after.type : "—"}</Tag.Label>
          </Tag.Root>
          <Code>{t.after ? formatSpecValue(t.after) : "—"}</Code>
        </HStack>
        <Text fontSize="xs" opacity={0.85}>
          {t.description}
        </Text>
      </VStack>
    );
  }

  if (t.kind === TransitionKind.Concatenation || t.kind === TransitionKind.NumericAddition) {
    const operands = Array.isArray(t.before) ? t.before : undefined;
    const opSymbol = t.kind === TransitionKind.Concatenation ? "⊕" : "+";
    const opBadge = t.kind === TransitionKind.Concatenation ? "concat" : "add";
    return (
      <VStack align="stretch" gap={2}>
        <HStack gap={2} align="center" flexWrap="wrap">
          <Code>{operands ? formatSpecValue(operands[0]) : "—"}</Code>
          <HStack gap={2}>
            <Text opacity={0.8}>{opSymbol}</Text>
            <Tag.Root
              size="sm"
              variant="outline"
              colorPalette={t.kind === TransitionKind.Concatenation ? "green" : "blue"}
            >
              <Tag.Label>{opBadge}</Tag.Label>
            </Tag.Root>
          </HStack>
          <Code>{operands ? formatSpecValue(operands[1]) : "—"}</Code>
        </HStack>
        <HStack gap={2} align="center" flexWrap="wrap">
          <Text opacity={0.8} fontSize="sm">
            =
          </Text>
          <Code>{t.after ? formatSpecValue(t.after) : "—"}</Code>
        </HStack>
        <Text fontSize="xs" opacity={0.85}>
          {t.description}
        </Text>
      </VStack>
    );
  }

  if (t.kind === TransitionKind.BranchDecision) {
    return (
      <VStack align="stretch" gap={2}>
        <Text fontSize="sm" fontFamily="mono">
          {t.label}
        </Text>
        <Text fontSize="xs" opacity={0.85}>
          {t.description}
        </Text>
      </VStack>
    );
  }

  if (t.kind === TransitionKind.ReturnValue) {
    return (
      <VStack align="stretch" gap={2}>
        <HStack gap={2} align="center" flexWrap="wrap">
          <Tag.Root size="sm" variant="outline" colorPalette="green">
            <Tag.Label>{t.after?.type ?? "—"}</Tag.Label>
          </Tag.Root>
          <Code>{t.after ? formatSpecValue(t.after) : "—"}</Code>
        </HStack>
        <Text fontSize="xs" opacity={0.85}>
          {t.description}
        </Text>
      </VStack>
    );
  }

  return (
    <Text fontSize="sm" opacity={0.8}>
      Unsupported transition kind: {t.kind}
    </Text>
  );
}

function TransitionCard({
  t,
  algoById,
  algoIdByFrameId,
  emphasized,
}: {
  t: ExplorerTransition;
  algoById: Map<string, Algorithm>;
  algoIdByFrameId: Record<string, string>;
  emphasized: boolean;
}) {
  const palette = kindPalette[t.kind] ?? "gray";
  const algoId = t.frameId ? algoIdByFrameId[t.frameId] : undefined;
  const title = algoId ? (algoById.get(algoId)?.title ?? algoId) : undefined;

  return (
    <Card.Root
      size="sm"
      variant="subtle"
      animation="fade-in 160ms ease-out"
      borderWidth={emphasized ? "1px" : undefined}
      borderColor={emphasized ? `${palette}.solid` : undefined}
      boxShadow={emphasized ? `0 0 0 1px var(--chakra-colors-${palette}-solid)` : undefined}
      transition="box-shadow 200ms ease, border-color 200ms ease"
    >
      <Card.Header pb={2}>
        <VStack align="stretch" gap={1}>
          <TransitionHeader t={t} />
          <HStack justify="space-between" gap={3} flexWrap="wrap">
            <Text fontSize="sm" fontWeight="semibold">
              {t.label}
            </Text>
            {title ? (
              <Text fontSize="xs" opacity={0.75} fontFamily="mono">
                {title}
                {t.frameId ? (
                  <>
                    {" "}
                    · <Code>{t.frameId}</Code>
                  </>
                ) : null}
              </Text>
            ) : t.frameId ? (
              <Text fontSize="xs" opacity={0.75} fontFamily="mono">
                <Code>{t.frameId}</Code>
              </Text>
            ) : null}
          </HStack>
          {t.nodePath?.length ? (
            <Text fontSize="xs" opacity={0.7}>
              nodePath: <Code>{formatNodePath(t.nodePath)}</Code>
            </Text>
          ) : null}
        </VStack>
      </Card.Header>
      <Card.Body pt={2}>
        <TransitionBody t={t} />
      </Card.Body>
    </Card.Root>
  );
}

function groupByFrameId(transitions: ExplorerTransition[]): Array<{ frameId: string; items: ExplorerTransition[] }> {
  const groups = new Map<string, ExplorerTransition[]>();
  for (const t of transitions) {
    const frameId = t.frameId ?? `unknown@${t.stepIndex}`;
    const arr = groups.get(frameId);
    if (arr) arr.push(t);
    else groups.set(frameId, [t]);
  }
  return Array.from(groups.entries()).map(([frameId, items]) => ({
    frameId,
    items: items.sort((a, b) => a.stepIndex - b.stepIndex),
  }));
}

function findLastTransitionBefore(
  transitionsByStep: ExplorerTransition[][],
  idx: number,
  predicate?: (t: ExplorerTransition) => boolean,
): ExplorerTransition | undefined {
  for (let i = idx; i >= 0; i--) {
    const ts = transitionsByStep[i];
    if (!ts?.length) continue;
    if (!predicate) return ts[ts.length - 1];
    for (let j = ts.length - 1; j >= 0; j--) {
      const t = ts[j];
      if (predicate(t)) return t;
    }
  }
  return undefined;
}

function isValueTransition(t: ExplorerTransition): boolean {
  return (
    t.kind === TransitionKind.Coercion ||
    t.kind === TransitionKind.Concatenation ||
    t.kind === TransitionKind.NumericAddition
  );
}

export function TransitionsFeed({
  selectedIndex,
  transitionsByStep,
  frameTree,
  algoById,
  hoveredStepIndex,
  onSelectIndex,
}: {
  selectedIndex: number;
  transitionsByStep: ExplorerTransition[][];
  frameTree: FrameTree;
  algoById: Map<string, Algorithm>;
  hoveredStepIndex?: number;
  onSelectIndex?: (index: number) => void;
}) {
  const current = transitionsByStep[selectedIndex] ?? [];
  const currentValueTransitions = React.useMemo(() => current.filter(isValueTransition), [current]);
  const lastAny = React.useMemo(
    () => (current.length ? undefined : findLastTransitionBefore(transitionsByStep, selectedIndex - 1)),
    [current.length, selectedIndex, transitionsByStep],
  );
  const lastValue = React.useMemo(
    () =>
      currentValueTransitions.length
        ? undefined
        : findLastTransitionBefore(transitionsByStep, selectedIndex - 1, isValueTransition),
    [currentValueTransitions.length, selectedIndex, transitionsByStep],
  );

  const history = React.useMemo(() => {
    const start = Math.max(0, selectedIndex - 200);
    const out: ExplorerTransition[] = [];
    for (let i = start; i <= selectedIndex; i++) out.push(...(transitionsByStep[i] ?? []));
    return out;
  }, [selectedIndex, transitionsByStep]);

  const grouped = React.useMemo(() => groupByFrameId(history), [history]);

  const [expandedFrames, setExpandedFrames] = React.useState<Record<string, boolean>>(() => Object.create(null));

  return (
    <VStack align="stretch" gap={3} minH={0}>
      <Box>
        <Text fontSize="sm" fontWeight="semibold">
          Transitions
        </Text>
        <Text fontSize="xs" opacity={0.75}>
          step <Code>{selectedIndex + 1}</Code>
        </Text>
      </Box>

      {current.length ? (
        <VStack align="stretch" gap={3}>
          {current.map((t) => (
            <TransitionCard
              key={t.id}
              t={t}
              algoById={algoById}
              algoIdByFrameId={frameTree.algoIdByFrameId}
              emphasized={hoveredStepIndex !== undefined ? t.stepIndex === hoveredStepIndex : false}
            />
          ))}
          {!currentValueTransitions.length && lastValue ? (
            <Card.Root size="sm" variant="subtle" opacity={0.92}>
              <Card.Body>
                <HStack justify="space-between" align="center" mb={2} gap={3} flexWrap="wrap">
                  <Text fontSize="xs" opacity={0.8}>
                    Last value transition (step #{lastValue.stepIndex + 1})
                  </Text>
                  {onSelectIndex ? (
                    <Button size="xs" variant="outline" onClick={() => onSelectIndex(lastValue.stepIndex)}>
                      Jump
                    </Button>
                  ) : null}
                </HStack>
                <TransitionCard
                  t={lastValue}
                  algoById={algoById}
                  algoIdByFrameId={frameTree.algoIdByFrameId}
                  emphasized={hoveredStepIndex !== undefined ? lastValue.stepIndex === hoveredStepIndex : false}
                />
              </Card.Body>
            </Card.Root>
          ) : null}
        </VStack>
      ) : (
        <Card.Root size="sm" variant="subtle">
          <Card.Body>
            <Text fontSize="sm" opacity={0.8}>
              No transitions in this step.
            </Text>
            {lastAny ? (
              <Box mt={3} opacity={0.85}>
                <HStack justify="space-between" align="center" mb={2} gap={3} flexWrap="wrap">
                  <Text fontSize="xs" opacity={0.8}>
                    Last transition (step #{lastAny.stepIndex + 1})
                  </Text>
                  {onSelectIndex ? (
                    <Button size="xs" variant="outline" onClick={() => onSelectIndex(lastAny.stepIndex)}>
                      Jump
                    </Button>
                  ) : null}
                </HStack>
                <TransitionCard
                  t={lastAny}
                  algoById={algoById}
                  algoIdByFrameId={frameTree.algoIdByFrameId}
                  emphasized={hoveredStepIndex !== undefined ? lastAny.stepIndex === hoveredStepIndex : false}
                />
              </Box>
            ) : null}
          </Card.Body>
        </Card.Root>
      )}

      <Separator />

      <Box minH={0}>
        <HStack justify="space-between" align="end" gap={3}>
          <Text fontSize="sm" fontWeight="semibold">
            History (grouped by frame)
          </Text>
          <Text fontSize="xs" opacity={0.7}>
            showing last <Code>{Math.min(200, selectedIndex + 1)}</Code> step(s)
          </Text>
        </HStack>

        <VStack align="stretch" gap={2} mt={2} minH={0}>
          {grouped.length === 0 ? (
            <Text fontSize="sm" opacity={0.7}>
              No transitions yet.
            </Text>
          ) : (
            grouped.map((g) => {
              const algoId = frameTree.algoIdByFrameId[g.frameId];
              const title = algoId ? (algoById.get(algoId)?.title ?? algoId) : g.frameId;
              const isExpanded = !!expandedFrames[g.frameId];
              const items = g.items;
              const visible = isExpanded ? items : items.slice(Math.max(0, items.length - 3));
              const hiddenCount = Math.max(0, items.length - visible.length);
              return (
                <Card.Root key={g.frameId} size="sm" variant="outline" overflow="hidden">
                  <Card.Header pb={2}>
                    <HStack justify="space-between" align="start" gap={3} flexWrap="wrap">
                      <VStack align="start" gap={0.5}>
                        <Text fontSize="sm" fontWeight="semibold">
                          {title}
                        </Text>
                        <Text fontSize="xs" opacity={0.75} fontFamily="mono">
                          frame <Code>{g.frameId}</Code> · transitions <Code>{items.length}</Code>
                        </Text>
                      </VStack>
                      {hiddenCount ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setExpandedFrames((prev) => ({ ...prev, [g.frameId]: !isExpanded }))}
                        >
                          {isExpanded ? "Collapse" : `+${hiddenCount} older`}
                        </Button>
                      ) : null}
                    </HStack>
                  </Card.Header>
                  <Card.Body pt={2}>
                    <VStack align="stretch" gap={2}>
                      {visible.map((t) => (
                        <TransitionCard
                          key={`${g.frameId}:${t.id}`}
                          t={t}
                          algoById={algoById}
                          algoIdByFrameId={frameTree.algoIdByFrameId}
                          emphasized={hoveredStepIndex !== undefined ? t.stepIndex === hoveredStepIndex : false}
                        />
                      ))}
                    </VStack>
                  </Card.Body>
                </Card.Root>
              );
            })
          )}
        </VStack>
      </Box>
    </VStack>
  );
}
