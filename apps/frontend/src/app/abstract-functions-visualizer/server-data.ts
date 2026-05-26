import type { SpecValue, TraceNode } from "@/app/abstract-functions-visualizer/spec-runner";
import {
  EMPTY_FUNCTION_CATALOG,
  getDefaultsForCategory,
  type AlgoCategory,
  type FunctionCatalog,
  type InitialTraceState,
  type VisualizerInitialData,
} from "./model";

const TRACE_SERVICE_URL = process.env.TRACE_SERVICE_URL?.replace(/\/$/, "") ?? "http://localhost:8085";

/** In-memory TTL cache: default trace per category is deterministic, no need to hit trace-service every request. */
const INITIAL_DATA_TTL_MS = 5 * 60 * 1000;
const initialDataCache = new Map<AlgoCategory, { expires: number; data: VisualizerInitialData }>();

type TraceResponse = {
  success?: boolean;
  result?: SpecValue;
  root?: TraceNode;
  effectiveAlgoId?: string;
  detectedOperator?: string;
  error?: string;
};

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");

  const response = await fetch(`${TRACE_SERVICE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data ? String(data.error) : response.statusText;
    throw new Error(message);
  }

  return data as T;
}

async function readText(path: string): Promise<string> {
  const response = await fetch(`${TRACE_SERVICE_URL}${path}`, {
    cache: "no-store",
    headers: { Accept: "text/html" },
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return response.text();
}

async function getFunctionCatalog(): Promise<FunctionCatalog> {
  try {
    const data = await readJson<Partial<FunctionCatalog>>("/functions");
    return {
      available_functions: Array.isArray(data.available_functions) ? data.available_functions : [],
      function_meta: data.function_meta ?? {},
      supported_operators: data.supported_operators,
    };
  } catch {
    return EMPTY_FUNCTION_CATALOG;
  }
}

async function getSpecHtml(functionName: string): Promise<string> {
  try {
    return await readText(`/spec/${encodeURIComponent(functionName)}`);
  } catch {
    return "";
  }
}

async function getInitialTrace(category: AlgoCategory, functionName: string, input: string): Promise<InitialTraceState> {
  const endpoint = category === "equality" ? "/execute/equality" : "/execute/type-conversion";
  const body = category === "equality" ? { input } : { functionName, input };

  try {
    const data = await readJson<TraceResponse>(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!data.success) {
      return {
        root: null,
        result: data.result,
        effectiveAlgoId: data.effectiveAlgoId ?? null,
        detectedOperator: data.detectedOperator ?? null,
        error: data.error ?? "trace-service returned failure",
      };
    }

    return {
      root: data.root ?? null,
      result: data.result,
      effectiveAlgoId: data.effectiveAlgoId ?? null,
      detectedOperator: data.detectedOperator ?? null,
      error: null,
    };
  } catch (error) {
    return {
      root: null,
      effectiveAlgoId: null,
      detectedOperator: null,
      error: error instanceof Error ? error.message : "trace-service unavailable",
    };
  }
}

export async function getVisualizerInitialData(category: AlgoCategory): Promise<VisualizerInitialData> {
  const cached = initialDataCache.get(category);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const defaults = getDefaultsForCategory(category);
  const [functionCatalog, specHtml, trace] = await Promise.all([
    getFunctionCatalog(),
    getSpecHtml(defaults.algo),
    getInitialTrace(category, defaults.algo, defaults.input),
  ]);

  const data: VisualizerInitialData = {
    category,
    selectedAlgo: defaults.algo,
    input: defaults.input,
    specHtml,
    trace,
    functionCatalog,
  };

  // Only cache successful traces — don't pin a trace-service outage for the full TTL.
  if (!trace.error) {
    initialDataCache.set(category, { expires: Date.now() + INITIAL_DATA_TTL_MS, data });
  }

  return data;
}
