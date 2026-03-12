import * as React from "react";
import type { SpecValue, TraceStep } from "@/app/abstract-functions-visualizer/spec-runner";
import type { TraceResult } from "@/app/abstract-functions-visualizer/algorithms/executors";

interface TraceState {
  trace: TraceStep[];
  setTrace: (next: TraceStep[]) => void;
  resultValue: SpecValue | undefined;
  setResultValue: (next: SpecValue | undefined) => void;
  error: string | null;
  setError: (next: string | null) => void;
  currentTraceResult: TraceResult | null;
  setCurrentTraceResult: (next: TraceResult | null) => void;
  clearError: () => void;
}

export function useTraceState(): TraceState {
  const [trace, setTrace] = React.useState<TraceStep[]>([]);
  const [resultValue, setResultValue] = React.useState<SpecValue | undefined>(undefined);
  const [error, setError] = React.useState<string | null>(null);
  const [currentTraceResult, setCurrentTraceResult] = React.useState<TraceResult | null>(null);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    trace,
    setTrace,
    resultValue,
    setResultValue,
    error,
    setError,
    currentTraceResult,
    setCurrentTraceResult,
    clearError,
  };
}
