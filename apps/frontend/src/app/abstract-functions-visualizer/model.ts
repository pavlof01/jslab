import type { SpecValue, TraceNode } from "./spec-runner";

export type AlgoCategory = "typeConversion" | "equality";

export const DEFAULTS_BY_CATEGORY: Record<AlgoCategory, { algo: string; input: string }> = {
  typeConversion: { algo: "ToNumber", input: '{ valueOf: () => "1" }' },
  equality: { algo: "BinaryExpression", input: "[] == !{}" },
};

export type FunctionMetaShape = {
  category: AlgoCategory;
  arity: "unary" | "binary";
  operator?: string;
};

export type FunctionCatalog = {
  available_functions: string[];
  function_meta: Record<string, FunctionMetaShape>;
  supported_operators?: string[];
};

export type InitialTraceState = {
  root: TraceNode | null;
  result?: SpecValue;
  effectiveAlgoId: string | null;
  detectedOperator: string | null;
  error: string | null;
};

export type VisualizerInitialData = {
  category: AlgoCategory;
  selectedAlgo: string;
  input: string;
  specHtml: string;
  trace: InitialTraceState;
  functionCatalog: FunctionCatalog;
};

export const EMPTY_FUNCTION_CATALOG: FunctionCatalog = {
  available_functions: [],
  function_meta: {},
};

export function getDefaultsForCategory(category: AlgoCategory) {
  return DEFAULTS_BY_CATEGORY[category];
}

export function fallbackInitialData(category: AlgoCategory): VisualizerInitialData {
  const defaults = DEFAULTS_BY_CATEGORY[category];
  return {
    category,
    selectedAlgo: defaults.algo,
    input: defaults.input,
    specHtml: "",
    trace: {
      root: null,
      result: undefined,
      effectiveAlgoId: null,
      detectedOperator: null,
      error: null,
    },
    functionCatalog: EMPTY_FUNCTION_CATALOG,
  };
}
