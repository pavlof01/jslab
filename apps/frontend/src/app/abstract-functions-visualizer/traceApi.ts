import type { AlgoCategory } from "./model";
import type { SpecValue, TraceNode } from "./spec-runner";

export interface TraceResult {
  root: TraceNode | null;
  result?: SpecValue;
  effectiveAlgoId: string | null;
  detectedOperator: string | null;
}

type TraceResponse = {
  success?: boolean;
  root?: TraceNode;
  result?: SpecValue;
  effectiveAlgoId?: string;
  detectedOperator?: string;
  error?: string;
};

function requestFor(category: AlgoCategory, algo: string, input: string) {
  if (category === "equality") {
    return { path: "/api/trace/execute/equality", body: { input } };
  }
  return { path: "/api/trace/execute/type-conversion", body: { functionName: algo, input } };
}

export async function executeTrace(
  category: AlgoCategory,
  algo: string,
  input: string,
): Promise<TraceResult> {
  const { path, body } = requestFor(category, algo, input);

  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data: TraceResponse | null = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error ?? `trace-service error ${response.status}`);
  }
  if (!data?.success) {
    throw new Error(data?.error ?? "trace-service returned failure");
  }

  return {
    root: data.root ?? null,
    result: data.result,
    effectiveAlgoId: data.effectiveAlgoId ?? null,
    detectedOperator: data.detectedOperator ?? null,
  };
}
