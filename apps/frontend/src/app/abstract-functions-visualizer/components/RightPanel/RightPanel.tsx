"use client";

import { type Algorithm, type SpecValue } from "@/app/coercion-visualizer/spec-runner";
import { ExecutorStepsPanel } from "@/app/coercion-visualizer/components/ExecutorStepsPanel";
import type { TraceResult } from "@/app/coercion-visualizer/algorithms/executors";

export interface RightPanelProps {
  currentTraceResult: TraceResult | null;
  selectedIndex: number;
  onSelectIndex: (next: number) => void;
  algoById: Map<string, Algorithm>;
}

export function RightPanel({ currentTraceResult, selectedIndex, onSelectIndex, algoById }: RightPanelProps) {
  return (
    <ExecutorStepsPanel
      traceResult={currentTraceResult}
      selectedStepIndex={selectedIndex}
      onSelectStepIndex={onSelectIndex}
    />
  );
}
