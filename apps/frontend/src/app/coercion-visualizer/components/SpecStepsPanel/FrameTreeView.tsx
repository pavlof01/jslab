"use client";

import * as React from "react";
import { Box, Collapsible, Text, VStack } from "@chakra-ui/react";

import type { Algorithm, TraceStep } from "@/app/coercion-visualizer/spec-runner";
import { nodePathKey } from "@/app/coercion-visualizer/lib/nodePathKey";
import type { FrameTree, TraceFrame } from "@/app/coercion-visualizer/traceModel";
import { isSameNodePath, type NodePath } from "@/app/coercion-visualizer/traceModel";
import { collectCallAlgos, flattenInstrs, type SpecLine } from "@/app/coercion-visualizer/components/SpecStepsPanel/specStepsUtils";
import { FrameHeaderRow } from "@/app/coercion-visualizer/components/SpecStepsPanel/FrameHeaderRow";
import { SpecLineRow } from "@/app/coercion-visualizer/components/SpecStepsPanel/SpecLineRow";

type AlgoRenderData = {
  lines: SpecLine[];
  ordinalsByLineIndex: Array<number | undefined>;
  callsByNodeKey: Map<string, string[]>;
};

export type FrameTreeViewHandle = {
  scrollToFrame: (frameId: string) => void;
};

export const FrameTreeView = React.forwardRef<
  FrameTreeViewHandle,
  {
    algo?: Algorithm;
    algoById: Map<string, Algorithm>;
    trace: TraceStep[];
    selectedIndex: number;
    frameTree: FrameTree;
    selectedStep?: TraceStep;
    frames?: TraceFrame[];
    showDetails: boolean;
    transitionsCount: number;
    branchBadge?: "then" | "else";
    resolveStepIndex?: (algoId: string, nodePath?: NodePath) => number | undefined;
    onHoverStepIndex?: (index: number | undefined) => void;
  }
>(function FrameTreeView(
  {
    algo,
    algoById,
    trace,
    selectedIndex,
    frameTree,
    selectedStep,
    frames,
    showDetails,
    transitionsCount,
    branchBadge,
    resolveStepIndex,
    onHoverStepIndex,
  },
  ref,
) {
  const callOpenKeysRef = React.useRef<Set<string>>(new Set());
  const frameOpenKeysRef = React.useRef<Set<string>>(new Set());
  const [, forceRerender] = React.useState(0);

  const toggleCallKey = React.useCallback(
    (key: string) => {
      const set = callOpenKeysRef.current;
      if (set.has(key)) set.delete(key);
      else set.add(key);
      forceRerender((v) => v + 1);
    },
    [forceRerender],
  );

  const toggleFrameKey = React.useCallback(
    (key: string) => {
      const set = frameOpenKeysRef.current;
      if (set.has(key)) set.delete(key);
      else set.add(key);
      forceRerender((v) => v + 1);
    },
    [forceRerender],
  );

  const frameHeaderRefs = React.useRef<Record<string, HTMLDivElement | null>>(Object.create(null));
  const scrollToFrame = React.useCallback(
    (frameId: string) => {
      frameOpenKeysRef.current.add(frameId);
      forceRerender((v) => v + 1);
      const el = frameHeaderRefs.current[frameId];
      if (!el) return;
      el.scrollIntoView({ block: "start", behavior: "smooth" });
    },
    [forceRerender],
  );
  React.useImperativeHandle(ref, () => ({ scrollToFrame }), [scrollToFrame]);

  const activeRowRef = React.useRef<HTMLDivElement | null>(null);
  const activeRowKey = React.useMemo(() => {
    if (!selectedStep) return undefined;
    if (selectedStep.kind !== "let" && selectedStep.kind !== "if" && selectedStep.kind !== "return") return undefined;
    const frameId = selectedStep.frameId ?? "legacy";
    return `${frameId}:${nodePathKey(selectedStep.nodePath)}`;
  }, [selectedStep]);
  React.useEffect(() => {
    if (!activeRowKey) return;
    const el = activeRowRef.current;
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeRowKey]);

  const currentFrameId = frames?.[frames.length - 1]?.id;
  const currentStackIds = React.useMemo(() => new Set((frames ?? []).map((f) => f.id)), [frames]);

  const callIndexByFrameId = React.useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < trace.length; i++) {
      const s = trace[i];
      if (s.kind === "call" && s.frameId) map.set(s.frameId, i);
    }
    return map;
  }, [trace]);

  const retIndexByFrameId = React.useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < trace.length; i++) {
      const s = trace[i];
      if (s.kind === "ret" && s.frameId) map.set(s.frameId, i);
    }
    return map;
  }, [trace]);

  const execIndexByFrameNodeKey = React.useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    const max = Math.min(trace.length - 1, selectedIndex);
    if (max < 0) return map;
    for (let i = 0; i <= max; i++) {
      const s = trace[i];
      if (s.kind !== "let" && s.kind !== "if" && s.kind !== "return") continue;
      const frameId = s.frameId ?? "legacy";
      const key = nodePathKey(s.nodePath);
      if (!key) continue;
      let m = map.get(frameId);
      if (!m) {
        m = new Map<string, number>();
        map.set(frameId, m);
      }
      m.set(key, i);
    }
    return map;
  }, [selectedIndex, trace]);

  const algoRenderDataById = React.useMemo(() => {
    const ids = new Set<string>();
    if (algo?.id) ids.add(algo.id);
    for (const algoId of Object.values(frameTree.algoIdByFrameId)) ids.add(algoId);

    const map = new Map<string, AlgoRenderData>();
    for (const algoId of ids) {
      const a = algoById.get(algoId) ?? (algo?.id === algoId ? algo : undefined);
      if (!a) continue;
      const lines = flattenInstrs(a.body, [], 0);
      const ordinalsByLineIndex: Array<number | undefined> = [];
      let ordinal = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]?.kind !== "instr") continue;
        ordinal += 1;
        ordinalsByLineIndex[i] = ordinal;
      }
      const callsByNodeKey = new Map<string, string[]>();
      for (const line of lines) {
        if (line.kind !== "instr" || !line.instr) continue;
        const out: string[] = [];
        if (line.instr.op === "let") collectCallAlgos(line.instr.expr, out);
        if (line.instr.op === "if") collectCallAlgos(line.instr.cond, out);
        if (line.instr.op === "return") collectCallAlgos(line.instr.expr, out);
        callsByNodeKey.set(nodePathKey(line.nodePath), Array.from(new Set(out)));
      }
      map.set(algoId, { lines, ordinalsByLineIndex, callsByNodeKey });
    }
    return map;
  }, [algo, algoById, frameTree.algoIdByFrameId]);

  const resolveFrameStepIndex = React.useCallback(
    (frameId: string, algoId: string, nodePath?: NodePath) => {
      if (!nodePath?.length) return undefined;
      const key = nodePathKey(nodePath);
      if (!key) return undefined;
      const candidates: number[] = [];
      for (let i = 0; i < trace.length; i++) {
        const s = trace[i];
        if (s.kind !== "let" && s.kind !== "if" && s.kind !== "return") continue;
        if ((s.frameId ?? "legacy") !== frameId) continue;
        if (s.algoId !== algoId) continue;
        if (nodePathKey(s.nodePath) !== key) continue;
        candidates.push(i);
      }
      if (!candidates.length) return resolveStepIndex?.(algoId, nodePath);
      for (let i = candidates.length - 1; i >= 0; i--) {
        const idx = candidates[i];
        if (idx <= selectedIndex) return idx;
      }
      return candidates[0];
    },
    [resolveStepIndex, selectedIndex, trace],
  );

  const rootFrameId = frameTree.roots[0];

  const renderFrame = (frameId: string, depth: number, seen: Set<string>): React.ReactNode => {
    if (seen.has(frameId)) return null;
    seen.add(frameId);

    const algoId = frameTree.algoIdByFrameId[frameId];
    const renderData = algoId ? algoRenderDataById.get(algoId) : undefined;
    const lines = renderData?.lines ?? [];
    const ordinalsByLineIndex = renderData?.ordinalsByLineIndex;
    const callsByNodeKey = renderData?.callsByNodeKey;
    const title = algoId ? (algoById.get(algoId)?.title ?? algoId) : "Unknown algorithm";

    const callIndex = callIndexByFrameId.get(frameId);
    const retIndex = retIndexByFrameId.get(frameId);
    const started = callIndex !== undefined && callIndex <= selectedIndex;
    const completed = retIndex !== undefined && retIndex <= selectedIndex;
    const inStack = currentStackIds.has(frameId);
    const isCurrent = frameId === currentFrameId;
    const isRoot = frameId === rootFrameId;
    const isExpanded = isRoot || inStack || frameOpenKeysRef.current.has(frameId);

    const frameOpacity = isCurrent ? 1 : inStack ? 0.9 : completed ? 0.55 : started ? 0.75 : 0.35;

    const execMap = execIndexByFrameNodeKey.get(frameId);

    return (
      <Box key={frameId} pl={depth * 10} opacity={frameOpacity}>
        <FrameHeaderRow
          frameId={frameId}
          algoId={algoId}
          title={title}
          depth={depth}
          isCurrent={isCurrent}
          inStack={inStack}
          started={started}
          completed={completed}
          isRoot={isRoot}
          isExpanded={isExpanded}
          onToggleExpanded={() => toggleFrameKey(frameId)}
          onHeaderRef={(el) => {
            frameHeaderRefs.current[frameId] = el;
          }}
        />

        <Collapsible.Root open={isExpanded}>
          <Collapsible.Content>
            <VStack align="stretch" gap={1} mt={2}>
              {lines.length === 0 ? (
                <Text fontSize="sm" opacity={0.7}>
                  No steps to display.
                </Text>
              ) : (
                lines.map((line, idx) => {
                  const lineKey = nodePathKey(line.nodePath);
                  const execIdx = lineKey ? execMap?.get(lineKey) : undefined;
                  const isDone = execIdx !== undefined;
                  const execStep = execIdx !== undefined ? trace[execIdx] : undefined;
                  const displayNo = line.kind === "instr" ? (ordinalsByLineIndex?.[idx] ?? idx + 1) : undefined;

                  const isActive =
                    !!selectedStep &&
                    (selectedStep.kind === "let" || selectedStep.kind === "if" || selectedStep.kind === "return") &&
                    (selectedStep.frameId ?? "legacy") === frameId &&
                    selectedStep.algoId === algoId &&
                    line.kind === "instr" &&
                    isSameNodePath(line.nodePath, selectedStep.nodePath);

                  const calls =
                    line.kind === "instr"
                      ? (callsByNodeKey?.get(nodePathKey(line.nodePath)) ?? [])
                      : ([] as string[]);
                  const callToggleKey = `${frameId}:${algoId}:${lineKey}:calls`;
                  const rowOpacity = line.kind === "branch" ? 0.75 : isDone && !isActive ? 0.55 : 1;

                  return (
                    <SpecLineRow
                      key={`${frameId}:${idx}:${line.text}`}
                      line={line}
                      frameId={frameId}
                      algoId={algoId}
                      displayNo={displayNo}
                      execStep={execStep}
                      isDone={isDone}
                      isActive={isActive}
                      transitionsCount={transitionsCount}
                      branchBadge={branchBadge}
                      showDetails={showDetails}
                      calls={calls}
                      callToggleKey={callToggleKey}
                      isCallOpen={callOpenKeysRef.current.has(callToggleKey)}
                      onToggleCallKey={toggleCallKey}
                      rowOpacity={rowOpacity}
                      onHoverStepIndex={onHoverStepIndex}
                      resolveFrameStepIndex={resolveFrameStepIndex}
                      activeRowRef={activeRowRef}
                      algoById={algoById}
                    />
                  );
                })
              )}
            </VStack>

            {(frameTree.childrenById[frameId] ?? []).map((childId) => renderFrame(childId, depth + 1, seen))}
          </Collapsible.Content>
        </Collapsible.Root>
      </Box>
    );
  };

  return (
    <Box borderWidth="1px" borderRadius="md" overflow="auto" maxH={{ base: "42vh", lg: "62vh" }} p={2}>
      <VStack align="stretch" gap={1} minH={0}>
        {frameTree.roots.length === 0 ? (
          <Text fontSize="sm" opacity={0.7}>
            No steps to display.
          </Text>
        ) : (
          frameTree.roots.map((id) => renderFrame(id, 0, new Set<string>()))
        )}
      </VStack>
    </Box>
  );
});
