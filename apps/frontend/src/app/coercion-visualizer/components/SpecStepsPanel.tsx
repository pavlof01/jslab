"use client";

import * as React from "react";
import { Box, Card, Collapsible, Separator, VStack, useDisclosure } from "@chakra-ui/react";

import type { Algorithm, TraceStep } from "@/app/coercion-visualizer/spec-runner";
import { getInstrAtPath } from "@/app/coercion-visualizer/lib/algoIr";
import type { FrameTree, TraceFrame } from "@/app/coercion-visualizer/traceModel";
import { type NodePath } from "@/app/coercion-visualizer/traceModel";
import { CallStepPreview } from "@/app/coercion-visualizer/components/SpecStepsPanel/CallStepPreview";
import { CoercionMomentBanner } from "@/app/coercion-visualizer/components/SpecStepsPanel/CoercionMomentBanner";
import { FrameTreeView, type FrameTreeViewHandle } from "@/app/coercion-visualizer/components/SpecStepsPanel/FrameTreeView";
import { SpecStepsHeader } from "@/app/coercion-visualizer/components/SpecStepsPanel/SpecStepsHeader";

export function SpecStepsPanel({
  algo,
  algoById,
  trace,
  selectedIndex,
  frameTree,
  selectedStep,
  frames,
  highlight,
  resolveStepIndex,
  onHoverStepIndex,
}: {
  algo?: Algorithm;
  algoById: Map<string, Algorithm>;
  trace: TraceStep[];
  selectedIndex: number;
  frameTree: FrameTree;
  selectedStep?: TraceStep;
  frames?: TraceFrame[];
  highlight?: { algoId: string; nodePath: NodePath };
  resolveStepIndex?: (algoId: string, nodePath?: NodePath) => number | undefined;
  onHoverStepIndex?: (index: number | undefined) => void;
}) {
  const debug = useDisclosure();
  const callView = useDisclosure();
  const [showDetails, setShowDetails] = React.useState(true);

  const stackLabel = React.useMemo(() => {
    const stack = selectedStep?.stack ?? [];
    if (stack.length === 0) return undefined;
    return stack
      .map((id) => algoById.get(id)?.title ?? id)
      .slice(-5)
      .join(" › ");
  }, [algoById, selectedStep]);

  const breadcrumbFrames = React.useMemo(() => {
    if (!frames?.length) return [];
    return frames.map((f, idx) => ({
      id: f.id,
      title: algoById.get(f.algoId)?.title ?? f.algoId,
      isCurrent: idx === frames.length - 1,
    }));
  }, [algoById, frames]);

  const instrJson = React.useMemo(() => {
    if (!highlight) return undefined;
    const a = algoById.get(highlight.algoId) ?? (algo?.id === highlight.algoId ? algo : undefined);
    if (!a) return undefined;
    const instr = getInstrAtPath(a, highlight.nodePath);
    if (!instr) return undefined;
    return JSON.stringify(instr, null, 2);
  }, [algo, algoById, highlight]);

  const transitionsCount = React.useMemo(() => {
    if (!selectedStep) return 0;
    if (selectedStep.kind !== "let" && selectedStep.kind !== "return") return 0;
    return selectedStep.transitions?.length ?? 0;
  }, [selectedStep]);

  const branchBadge = React.useMemo(() => {
    if (!selectedStep) return undefined;
    if (selectedStep.kind !== "if") return undefined;
    return selectedStep.decision.taken;
  }, [selectedStep]);

  const callStepInfo = React.useMemo(() => {
    if (!selectedStep) return undefined;
    if (selectedStep.kind !== "call") return undefined;
    const called = algoById.get(selectedStep.toAlgo);
    return {
      algoId: selectedStep.toAlgo,
      title: called?.title ?? selectedStep.toAlgo,
      algo: called,
    };
  }, [algoById, selectedStep]);

  const rootFrameId = frameTree.roots[0];
  const rootAlgoId = rootFrameId ? frameTree.algoIdByFrameId[rootFrameId] : algo?.id;
  const rootAlgo = rootAlgoId ? (algoById.get(rootAlgoId) ?? algo) : algo;

  const currentAlgoTitle = React.useMemo(() => {
    const currentAlgoId = frames?.[frames.length - 1]?.algoId;
    if (!currentAlgoId || !rootAlgo?.id || currentAlgoId === rootAlgo.id) return undefined;
    return algoById.get(currentAlgoId)?.title ?? currentAlgoId;
  }, [algoById, frames, rootAlgo?.id]);

  const frameTreeViewRef = React.useRef<FrameTreeViewHandle | null>(null);
  const scrollToFrame = React.useCallback((frameId: string) => {
    frameTreeViewRef.current?.scrollToFrame(frameId);
  }, []);

  return (
    <Card.Root size="sm" minH={0}>
      <Card.Header pb={2}>
        <SpecStepsHeader
          rootAlgo={rootAlgo}
          stackLabel={stackLabel}
          breadcrumbFrames={breadcrumbFrames}
          onScrollToFrame={scrollToFrame}
          highlightNodePath={highlight?.nodePath}
          currentAlgoTitle={currentAlgoTitle}
          showDetails={showDetails}
          onShowDetailsChange={setShowDetails}
          debugOpen={debug.open}
          onToggleDebug={debug.onToggle}
          debugEnabled={!!instrJson}
        />
      </Card.Header>

      <Card.Body pt={2} minH={0}>
        <VStack align="stretch" gap={3} minH={0}>
          {callStepInfo ? (
            <CallStepPreview
              algoId={callStepInfo.algoId}
              title={callStepInfo.title}
              algo={callStepInfo.algo}
              open={callView.open}
              onToggleOpen={callView.onToggle}
            />
          ) : null}

          {transitionsCount ? <CoercionMomentBanner transitionsCount={transitionsCount} /> : null}

          <FrameTreeView
            ref={frameTreeViewRef}
            algo={algo}
            algoById={algoById}
            trace={trace}
            selectedIndex={selectedIndex}
            frameTree={frameTree}
            selectedStep={selectedStep}
            frames={frames}
            showDetails={showDetails}
            transitionsCount={transitionsCount}
            branchBadge={branchBadge}
            resolveStepIndex={resolveStepIndex}
            onHoverStepIndex={onHoverStepIndex}
          />

          {instrJson ? (
            <>
              <Separator />
              <Collapsible.Root open={debug.open}>
                <Collapsible.Content>
                  <Box
                    as="pre"
                    borderWidth="1px"
                    borderRadius="md"
                    overflow="auto"
                    maxH="28vh"
                    p={3}
                    fontSize="xs"
                    fontFamily="mono"
                    opacity={0.9}
                  >
                    {instrJson}
                  </Box>
                </Collapsible.Content>
              </Collapsible.Root>
            </>
          ) : null}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}

