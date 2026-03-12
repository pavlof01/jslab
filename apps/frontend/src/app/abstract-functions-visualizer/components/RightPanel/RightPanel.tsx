"use client";

import { type Algorithm, type SpecValue } from "@/app/abstract-functions-visualizer/spec-runner";
import { ExecutorStepsPanel } from "@/app/abstract-functions-visualizer/components/ExecutorStepsPanel";
import type { TraceResult } from "@/app/abstract-functions-visualizer/algorithms/executors";

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
