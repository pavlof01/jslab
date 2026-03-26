import type { SpecValue } from "@/app/abstract-functions-visualizer/spec-runner";
import {
  type TraceServiceResponse,
  traceServiceResponseToTraceResult,
} from "@/app/abstract-functions-visualizer/adapters/trace-node-adapter";
import { TraceResult } from "../abstract-operations-tracer";

export interface ExecutionResult {
  traceResult: TraceResult;
  resultValue: SpecValue;
}

export async function executeAlgorithmTrace(
  functionName: string,
  input: unknown,
  preferredType?: "string" | "number",
): Promise<ExecutionResult> {
  const response = await fetch("/api/trace/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ functionName, input: "1", preferredType }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err?.error ?? `trace-service error ${response.status}`);
  }

  const data: TraceServiceResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error ?? "trace-service returned failure");
  }

  const traceResult = traceServiceResponseToTraceResult(data);

  const resultValue: SpecValue =
    data.resultType === "number"
      ? { type: "Number", value: Number(data.resultValue) }
      : data.resultType === "string"
        ? { type: "String", value: data.resultValue }
        : data.resultType === "boolean"
          ? { type: "Boolean", value: data.resultValue === "true" }
          : { type: "Undefined", value: undefined };

  return { traceResult, resultValue };
}
