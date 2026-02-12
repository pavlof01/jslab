"use client";

import * as React from "react";
import { Box, Grid, createListCollection } from "@chakra-ui/react";

import catalogJson from "@/app/coercion-visualizer/coercion-showcase.catalog.json";
import { intrinsicImpls } from "@/app/coercion-visualizer/intrinsics";
import {
  SpecRunner,
  type Algorithm,
  type Catalog,
  type SpecValue,
  type TraceStep,
} from "@/app/coercion-visualizer/spec-runner";
import { AlgorithmStepsPanel } from "@/app/coercion-visualizer/components/AlgorithmStepsPanel";
import { ExplorerSidebar } from "@/app/coercion-visualizer/components/ExplorerSidebar";
import { ExecutionTreePanel } from "@/app/coercion-visualizer/components/ExecutionTreePanel";
import { PlaybackDock } from "@/app/coercion-visualizer/components/PlaybackDock";
import { useColorModeValue } from "@/components/ui/color-mode";
import { buildTraceModel, TransitionKind } from "@/app/coercion-visualizer/traceModel";
import { computeEntry, OP_ITEMS, type Mode, type Op, type Preset } from "@/app/coercion-visualizer/model";

const opCollection = createListCollection({
  items: OP_ITEMS,
});

export function CoercionVisualizer() {
  const [mode, setMode] = React.useState<Mode>("coercion");
  const [op, setOp] = React.useState<Op>("==");
  const [x, setX] = React.useState<SpecValue>({ type: "Number", value: 1 });
  const [y, setY] = React.useState<SpecValue>({ type: "String", value: "1" });

  const [trace, setTrace] = React.useState<TraceStep[]>([]);
  const [resultValue, setResultValue] = React.useState<SpecValue | undefined>(undefined);
  const [error, setError] = React.useState<string | null>(null);

  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const catalog = React.useMemo(() => catalogJson as unknown as Catalog, []);
  const algoById = React.useMemo(() => new Map<string, Algorithm>(catalog.algorithms.map((a) => [a.id, a])), [catalog]);
  const algoCollection = React.useMemo(
    () =>
      createListCollection({
        items: catalog.algorithms
          .slice()
          .sort((a, b) => (a.title ?? a.id).localeCompare(b.title ?? b.id))
          .map((a) => ({ label: a.title ?? a.id, value: a.id })),
      }),
    [catalog.algorithms],
  );

  const runner = React.useMemo(
    () =>
      new SpecRunner(catalog, intrinsicImpls, {
        autoTransitions: true,
        coercionAlgos: ["ToNumber", "ToString", "ToPrimitive", "OrdinaryToPrimitive"],
      }),
    [catalog],
  );

  const defaultExploreAlgoId = React.useMemo(() => {
    if (algoById.has("AbstractEqualityComparison")) return "AbstractEqualityComparison";
    return catalog.algorithms[0]?.id ?? "AbstractEqualityComparison";
  }, [algoById, catalog.algorithms]);

  const [exploreAlgoId, setExploreAlgoId] = React.useState<string>(defaultExploreAlgoId);
  const exploreAlgo = exploreAlgoId ? algoById.get(exploreAlgoId) : undefined;
  const [exploreArgsByParam, setExploreArgsByParam] = React.useState<Record<string, SpecValue>>(() =>
    Object.create(null),
  );

  React.useEffect(() => {
    setExploreAlgoId((cur) => {
      if (cur && algoById.has(cur)) return cur;
      return defaultExploreAlgoId;
    });
  }, [algoById, defaultExploreAlgoId]);

  React.useEffect(() => {
    if (!exploreAlgo) return;
    setExploreArgsByParam((prev) => {
      const next: Record<string, SpecValue> = Object.create(null);
      for (const [k, v] of Object.entries(prev)) next[k] = v;
      for (const name of exploreAlgo.params) {
        if (!(name in next)) next[name] = { type: "Undefined", value: undefined };
      }
      return next;
    });
  }, [exploreAlgo]);

  const entry = React.useMemo(() => {
    if (mode === "coercion") return computeEntry(op, x, y);
    if (!exploreAlgo) return { entryAlgo: exploreAlgoId, args: [], preview: exploreAlgoId };
    const args = exploreAlgo.params.map((p) => exploreArgsByParam[p] ?? { type: "Undefined", value: undefined });
    const sig = exploreAlgo.params.length ? exploreAlgo.params.join(", ") : "";
    return { entryAlgo: exploreAlgo.id, args, preview: `${exploreAlgo.title ?? exploreAlgo.id}(${sig})` };
  }, [exploreAlgo, exploreAlgoId, exploreArgsByParam, mode, op, x, y]);

  const runNow = React.useCallback(() => {
    setIsPlaying(false);
    try {
      const r = runner.run(entry.entryAlgo, entry.args);
      setError(null);
      setTrace(r.trace);
      setResultValue(r.value);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown runner error";
      setError(msg);
      setTrace([]);
      setResultValue(undefined);
    }
  }, [entry.args, entry.entryAlgo, runner]);

  React.useEffect(() => {
    const t = window.setTimeout(() => runNow(), 150);
    return () => window.clearTimeout(t);
  }, [runNow]);

  React.useEffect(() => {
    setIsPlaying(false);
    setSelectedIndex(0);
  }, [mode]);

  const prevTraceLenRef = React.useRef(0);
  React.useEffect(() => {
    const newLen = trace.length;
    setSelectedIndex((prev) => {
      if (newLen <= 0) return 0;
      const prevLen = prevTraceLenRef.current;
      if (prevLen === 0) return newLen - 1;
      if (prev === prevLen - 1) return newLen - 1;
      return Math.min(prev, newLen - 1);
    });
    prevTraceLenRef.current = newLen;
  }, [trace.length]);

  React.useEffect(() => {
    if (!isPlaying) return;
    if (trace.length <= 1) return;
    const intervalMs = 650;
    const id = window.setInterval(() => {
      setSelectedIndex((idx) => {
        if (idx >= trace.length - 1) {
          setIsPlaying(false);
          return idx;
        }
        return idx + 1;
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [isPlaying, trace.length]);

  const onSelectIndex = React.useCallback(
    (next: number) => {
      setIsPlaying(false);
      const max = Math.max(0, trace.length - 1);
      setSelectedIndex(Math.max(0, Math.min(max, next)));
    },
    [trace.length],
  );

  const traceModel = React.useMemo(
    () =>
      buildTraceModel(trace, {
        getAlgoParams: (algoId) => algoById.get(algoId)?.params,
        getAlgoLocals: (algoId) => algoById.get(algoId)?.locals,
      }),
    [algoById, trace],
  );

  const step = trace[selectedIndex];
  const frameStackAtStep = traceModel.framesByStep[selectedIndex] ?? [];

  const currentFrames = frameStackAtStep;

  const pageBg = useColorModeValue("#f8f8f5", "#0a0a0a");
  const panelBg = useColorModeValue("#ffffff", "rgba(20,20,20,0.30)");
  const panelBorder = useColorModeValue("#e2e8f0", "#262626");
  const softSurfaceBgStrong = useColorModeValue("rgba(255,255,255,0.80)", "rgba(0,0,0,0.18)");

  const lastCoercion = React.useMemo(() => {
    for (let i = selectedIndex; i >= 0; i--) {
      const ts = traceModel.transitionsByStep[i] ?? [];
      for (let j = ts.length - 1; j >= 0; j--) {
        const t = ts[j];
        if (t.kind === TransitionKind.Coercion) return t;
      }
    }
    return undefined;
  }, [selectedIndex, traceModel.transitionsByStep]);

  const maxIndex = Math.max(0, trace.length - 1);

  const onApplyPreset = React.useCallback(
    (p: Preset) => {
      setIsPlaying(false);
      setMode("coercion");
      setOp(p.op);
      setX(p.x);
      if (p.y) setY(p.y);
    },
    [setIsPlaying, setMode, setOp, setX, setY],
  );

  return (
    <Box bg={pageBg} minH="92vh" overflow="hidden">
      <Grid templateColumns={{ base: "1fr", lg: "320px 1fr 420px" }} h={{ base: "auto", lg: "92vh" }} overflow="hidden">
        <ExplorerSidebar
          error={error}
          mode={mode}
          onModeChange={setMode}
          op={op}
          onOpChange={setOp}
          opCollection={opCollection}
          x={x}
          onXChange={setX}
          y={y}
          onYChange={setY}
          algoCollection={algoCollection}
          exploreAlgoId={exploreAlgoId}
          onExploreAlgoIdChange={setExploreAlgoId}
          exploreAlgo={exploreAlgo}
          exploreArgsByParam={exploreArgsByParam}
          onExploreArgChange={(param, next) => setExploreArgsByParam((prev) => ({ ...prev, [param]: next }))}
          resultValue={resultValue}
          traceLength={trace.length}
          entryPreview={entry.preview}
          lastCoercion={lastCoercion}
          currentFrames={currentFrames}
          algoById={algoById}
          onApplyPreset={onApplyPreset}
          panelBg={panelBg}
          panelBorder={panelBorder}
          softSurfaceBgStrong={softSurfaceBgStrong}
        />

        <Box position="relative" minH={0} overflow="hidden">
          <ExecutionTreePanel
            trace={trace}
            selectedIndex={selectedIndex}
            framesByStep={traceModel.framesByStep}
            algoById={algoById}
            entryLabel={entry.preview}
            onSelectIndex={onSelectIndex}
          />
          <PlaybackDock
            selectedIndex={selectedIndex}
            maxIndex={maxIndex}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((v) => !v)}
            onSelectIndex={onSelectIndex}
          />
        </Box>

        {(() => {
          const algoIdForPanel =
            step?.kind === "call"
              ? step.toAlgo
              : step?.kind === "ret"
                ? step.fromAlgo
                : step && "algoId" in step
                  ? step.algoId
                  : entry.entryAlgo;

          return (
            <AlgorithmStepsPanel
              algo={algoIdForPanel ? algoById.get(algoIdForPanel) : undefined}
              trace={trace}
              selectedIndex={selectedIndex}
              onSelectIndex={onSelectIndex}
              frameId={step?.frameId}
            />
          );
        })()}
      </Grid>
    </Box>
  );
}
