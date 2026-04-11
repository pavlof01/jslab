import type { SpecValue, TraceStep } from "@/app/abstract-functions-visualizer/spec-runner";

interface ExecuteApiResponse {
  success: boolean;
  functionName: string;
  resultValue: string;
  resultType: string;
  steps: TraceStep[];
  stepCount: number;
  error?: string;
}

export interface ExecutionResult {
  steps: TraceStep[];
  resultValue: SpecValue;
}

export async function executeAlgorithmTrace(
  functionName: string,
  inputExpression: string,
  preferredType?: "string" | "number",
): Promise<ExecutionResult> {
  const response = await fetch("/api/trace/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ functionName, input: inputExpression, preferredType }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err?.error ?? `trace-service error ${response.status}`);
  }

  const data: ExecuteApiResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error ?? "trace-service returned failure");
  }

  const resultValue: SpecValue =
    data.resultType === "number"
      ? { type: "Number", value: Number(data.resultValue) }
      : data.resultType === "string"
        ? { type: "String", value: data.resultValue }
        : data.resultType === "boolean"
          ? { type: "Boolean", value: data.resultValue === "true" }
          : { type: "Undefined", value: undefined };

  return { steps: data.steps, resultValue };
}
