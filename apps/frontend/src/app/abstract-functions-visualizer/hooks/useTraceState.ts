import * as React from "react";
import type { SpecValue, TraceStep } from "@/app/abstract-functions-visualizer/spec-runner";

interface TraceState {
  trace: TraceStep[];
  setTrace: (next: TraceStep[]) => void;
  resultValue: SpecValue | undefined;
  setResultValue: (next: SpecValue | undefined) => void;
  error: string | null;
  setError: (next: string | null) => void;
  clearError: () => void;
}

export function useTraceState(): TraceState {
  const [trace, setTrace] = React.useState<TraceStep[]>([]);
  const [resultValue, setResultValue] = React.useState<SpecValue | undefined>(undefined);
  const [error, setError] = React.useState<string | null>(null);

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
    clearError,
  };
}
