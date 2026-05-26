import type { SpecValue, TraceNode } from "./spec-runner";

export type AlgoCategory = "typeConversion" | "equality";

/** Each category has its own route. Single source of truth for nav + tabs. */
export const CATEGORY_ROUTES: Record<AlgoCategory, string> = {
  typeConversion: "/type-conversion",
  equality: "/equality",
};

export const DEFAULTS_BY_CATEGORY: Record<AlgoCategory, { algo: string; input: string }> = {
  typeConversion: { algo: "ToNumber", input: '{ valueOf: () => "1" }' },
  equality: { algo: "BinaryExpression", input: "[] == !{}" },
};

export type FunctionMetaShape = { category: AlgoCategory; arity: "unary" | "binary"; operator?: string };

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
