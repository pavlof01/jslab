import type { SpecValue } from "@/app/coercion-visualizer/spec-runner";
import type { TraceResult } from "@/app/coercion-visualizer/algorithms/executors";
import {
  ToNumberExecutor,
} from "@/app/coercion-visualizer/algorithms/executors";

interface ExecutionResult {
  traceResult: TraceResult;
  resultValue: SpecValue;
}

export function executeCoercion(algoId: string, x: SpecValue, y: SpecValue): ExecutionResult {
  if (algoId === "ToNumber") {
    const traceResult = ToNumberExecutor.execute(x?.value);
    return {
      traceResult,
      resultValue: {
        type: "Number",
        value: typeof traceResult.output === "number" ? traceResult.output : NaN,
      },
    };
  }

  throw new Error(`Unknown algorithm: ${algoId}`);
}

export function executeAlgorithmTrace(traceInput: unknown): ExecutionResult {
  const traceResult = ToNumberExecutor.execute(traceInput);
  return {
    traceResult,
    resultValue: {
      type: "Number",
      value: typeof traceResult.output === "number" ? traceResult.output : NaN,
    },
  };
}
