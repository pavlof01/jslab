import { createStore } from "zustand/vanilla";

import { type FlatEntry, flattenTrace } from "@/app/abstract-functions-visualizer/flatten";
import type { SpecValue, TraceNode } from "@/app/abstract-functions-visualizer/spec-runner";

import {
  type AlgoCategory,
  DEFAULTS_BY_CATEGORY,
  EMPTY_FUNCTION_CATALOG,
  type FunctionCatalog,
  type FunctionMetaShape,
  type VisualizerInitialData,
} from "./model";
import { executeTrace } from "./traceApi";

export { DEFAULTS_BY_CATEGORY };
export type { AlgoCategory, FunctionCatalog, FunctionMetaShape, VisualizerInitialData };

const DEFAULT_CATEGORY: AlgoCategory = "typeConversion";
const DEFAULT_ALGO = DEFAULTS_BY_CATEGORY[DEFAULT_CATEGORY].algo;
const DEFAULT_INPUT = DEFAULTS_BY_CATEGORY[DEFAULT_CATEGORY].input;

export interface VisualizerStore {
  // ── Trace ──────────────────────────────────────────────────────────────────
  root: TraceNode | null;
  flatEntries: FlatEntry[];
  resultValue: SpecValue | undefined;
  error: string | null;
  /** A trace request is in flight — the screen shows it as such. */
  isTracing: boolean;
  showSkipped: boolean;

  // ── Spec panel ─────────────────────────────────────────────────────────────
  specHtml: string;
  functionOptions: string[];
  functionMeta: Record<string, FunctionMetaShape>;

  // ── Input ──────────────────────────────────────────────────────────────────
  category: AlgoCategory;
  selectedAlgo: string;
  /** For equality (BinaryExpression): the spec algorithm actually executed for the current trace. */
  effectiveAlgoId: string | null;
  /** For equality (BinaryExpression): the operator parsed from the input. */
  detectedOperator: string | null;
  traceInputRaw: string;
  traceInputExpression: string;
  traceRequestId: number;

  // ── Playback ───────────────────────────────────────────────────────────────
  selectedIndex: number;
  isPlaying: boolean;

  // ── Collapse state — keyed by step path ─────────────────────────────────────
  collapsedBlocks: Record<string, boolean>;

  // ── Derived ────────────────────────────────────────────────────────────────
  maxIndex: () => number;

  // ── Actions ────────────────────────────────────────────────────────────────
  setRoot: (root: TraceNode | null) => void;
  setResultValue: (v: SpecValue | undefined) => void;
  setError: (e: string | null) => void;
  setShowSkipped: (v: boolean) => void;
  setSpecHtml: (html: string) => void;
  setFunctionCatalog: (catalog: FunctionCatalog) => void;
  setCategory: (c: AlgoCategory) => void;
  setSelectedAlgo: (algo: string) => void;
  setTraceInputRaw: (v: string) => void;
  commitTraceInput: (v: string) => void;
  setIsPlaying: (v: boolean | ((prev: boolean) => boolean)) => void;
  toggleBlock: (path: string) => void;
  onSelectIndex: (i: number) => void;
  onSelectPath: (path: string) => void;
  tickPlayback: () => void;
  runNow: () => Promise<void>;
  initializeFromServer: (data: VisualizerInitialData) => void;
}

export type VisualizerStoreApi = ReturnType<typeof createVisualizerStore>;

export function createVisualizerStore(initial?: VisualizerInitialData) {
  let latestTraceToken = 0;

  const store = createStore<VisualizerStore>()((set, get) => ({
    root: null,
    flatEntries: [],
    resultValue: undefined,
    error: null,
    isTracing: false,
    showSkipped: true,
    specHtml: "",
    functionOptions: EMPTY_FUNCTION_CATALOG.available_functions,
    functionMeta: EMPTY_FUNCTION_CATALOG.function_meta,
    category: DEFAULT_CATEGORY,
    selectedAlgo: DEFAULT_ALGO,
    effectiveAlgoId: null,
    detectedOperator: null,
    traceInputRaw: DEFAULT_INPUT,
    traceInputExpression: DEFAULT_INPUT,
    traceRequestId: 0,
    selectedIndex: 0,
    isPlaying: false,
    collapsedBlocks: {},

    maxIndex: () => Math.max(0, get().flatEntries.length - 1),

    setRoot: (root) =>
      set({
        root,
        flatEntries: root ? flattenTrace(root) : [],
        selectedIndex: 0,
        collapsedBlocks: {},
      }),

    setResultValue: (resultValue) => set({ resultValue }),
    setError: (error) => set({ error }),
    setShowSkipped: (showSkipped) => set({ showSkipped }),
    setSpecHtml: (specHtml) => set({ specHtml }),
    setFunctionCatalog: (catalog) =>
      set({
        functionOptions: catalog.available_functions,
        functionMeta: catalog.function_meta,
      }),
    setCategory: (category) => {
      const def = DEFAULTS_BY_CATEGORY[category];
      set({
        category,
        selectedAlgo: def.algo,
        effectiveAlgoId: null,
        detectedOperator: null,
        traceInputRaw: def.input,
        traceInputExpression: def.input,
        root: null,
        flatEntries: [],
        selectedIndex: 0,
        collapsedBlocks: {},
        error: null,
      });
    },
    setSelectedAlgo: (selectedAlgo) => set({ selectedAlgo }),
    setTraceInputRaw: (traceInputRaw) => set({ traceInputRaw }),
    commitTraceInput: (traceInputExpression) =>
      set((state) => ({ traceInputExpression, traceRequestId: state.traceRequestId + 1 })),

    setIsPlaying: (v) => set((s) => ({ isPlaying: typeof v === "function" ? v(s.isPlaying) : v })),

    toggleBlock: (path) =>
      set((s) => ({
        collapsedBlocks: { ...s.collapsedBlocks, [path]: !s.collapsedBlocks[path] },
      })),

    onSelectIndex: (i) => {
      const max = get().maxIndex();
      set({ isPlaying: false, selectedIndex: Math.max(0, Math.min(max, i)) });
    },

    onSelectPath: (path) => {
      const { flatEntries } = get();
      const i = flatEntries.findIndex((e) => e.path === path);
      if (i >= 0) set({ isPlaying: false, selectedIndex: i });
    },

    tickPlayback: () => {
      const { selectedIndex, flatEntries, setIsPlaying } = get();
      if (selectedIndex >= flatEntries.length - 1) {
        setIsPlaying(false);
      } else {
        set({ selectedIndex: selectedIndex + 1 });
      }
    },

    runNow: async () => {
      const {
        category,
        selectedAlgo,
        traceInputExpression,
        setIsPlaying,
        setError,
        setRoot,
        setResultValue,
      } = get();
      setIsPlaying(false);
      setError(null);
      const token = ++latestTraceToken;
      set({ isTracing: true });

      try {
        const trace = await executeTrace(category, selectedAlgo, traceInputExpression);
        if (token !== latestTraceToken) return;
        setRoot(trace.root);
        setResultValue(trace.result);
        set({
          effectiveAlgoId: trace.effectiveAlgoId,
          detectedOperator: trace.detectedOperator,
          isTracing: false,
        });
      } catch (error) {
        if (token !== latestTraceToken) return;
        setError(error instanceof Error ? error.message : "Unknown executor error");
        setRoot(null);
        setResultValue(undefined);
        set({ effectiveAlgoId: null, detectedOperator: null, isTracing: false });
      }
    },

    initializeFromServer: (data) => {
      const root = data.trace.root;

      set({
        category: data.category,
        selectedAlgo: data.selectedAlgo,
        traceInputRaw: data.input,
        traceInputExpression: data.input,
        root,
        flatEntries: root ? flattenTrace(root) : [],
        resultValue: data.trace.result,
        error: data.trace.error,
        specHtml: data.specHtml,
        functionOptions: data.functionCatalog.available_functions,
        functionMeta: data.functionCatalog.function_meta,
        effectiveAlgoId: data.trace.effectiveAlgoId,
        detectedOperator: data.trace.detectedOperator,
        selectedIndex: 0,
        isPlaying: false,
        collapsedBlocks: {},
      });
    },
  }));

  if (initial) store.getState().initializeFromServer(initial);
  return store;
}
