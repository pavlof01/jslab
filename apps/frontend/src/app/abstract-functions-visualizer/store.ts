import { create } from "zustand";
import type { SpecValue, TraceNode } from "@/app/abstract-functions-visualizer/spec-runner";
import { flattenTrace, type FlatEntry } from "@/app/abstract-functions-visualizer/flatten";

export type AlgoCategory = "typeConversion" | "equality";

const DEFAULTS_BY_CATEGORY: Record<AlgoCategory, { algo: string; input: string }> = {
  typeConversion: { algo: "ToNumber", input: '{ valueOf: () => "1" }' },
  equality: { algo: "BinaryExpression", input: "[] == !{}" },
};

const DEFAULT_CATEGORY: AlgoCategory = "typeConversion";
const DEFAULT_ALGO = DEFAULTS_BY_CATEGORY[DEFAULT_CATEGORY].algo;
const DEFAULT_INPUT = DEFAULTS_BY_CATEGORY[DEFAULT_CATEGORY].input;

interface VisualizerStore {
  // ── Trace ──────────────────────────────────────────────────────────────────
  root: TraceNode | null;
  flatEntries: FlatEntry[];
  resultValue: SpecValue | undefined;
  error: string | null;
  showSkipped: boolean;

  // ── Spec panel ─────────────────────────────────────────────────────────────
  specHtml: string;
  specDrawerOpen: boolean;

  // ── Input ──────────────────────────────────────────────────────────────────
  category: AlgoCategory;
  selectedAlgo: string;
  /** For equality (BinaryExpression): the spec algorithm actually executed for the current trace. */
  effectiveAlgoId: string | null;
  /** For equality (BinaryExpression): the operator parsed from the input. */
  detectedOperator: string | null;
  traceInputRaw: string;
  traceInputExpression: string;

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
  setSpecDrawerOpen: (open: boolean) => void;
  setCategory: (c: AlgoCategory) => void;
  setSelectedAlgo: (algo: string) => void;
  setTraceInputRaw: (v: string) => void;
  commitTraceInput: (v: string) => void;
  setIsPlaying: (v: boolean | ((prev: boolean) => boolean)) => void;
  toggleBlock: (path: string) => void;
  onSelectIndex: (i: number) => void;
  onSelectPath: (path: string) => void;
  tickPlayback: () => void;
  runNow: () => void;
}

export const useVisualizerStore = create<VisualizerStore>((set, get) => ({
  root: null,
  flatEntries: [],
  resultValue: undefined,
  error: null,
  showSkipped: true,
  specHtml: "",
  specDrawerOpen: false,
  category: DEFAULT_CATEGORY,
  selectedAlgo: DEFAULT_ALGO,
  effectiveAlgoId: null,
  detectedOperator: null,
  traceInputRaw: DEFAULT_INPUT,
  traceInputExpression: DEFAULT_INPUT,
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
  setSpecDrawerOpen: (specDrawerOpen) => set({ specDrawerOpen }),
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
  commitTraceInput: (traceInputExpression) => set({ traceInputExpression }),

  setIsPlaying: (v) =>
    set((s) => ({ isPlaying: typeof v === "function" ? v(s.isPlaying) : v })),

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

  runNow: () => {
    const { category, selectedAlgo, traceInputExpression, setIsPlaying, setError, setRoot, setResultValue } = get();
    setIsPlaying(false);
    setError(null);

    const url =
      category === "equality"
        ? "/api/trace/execute/equality"
        : "/api/trace/execute/type-conversion";
    const body =
      category === "equality"
        ? { input: traceInputExpression }
        : { functionName: selectedAlgo, input: traceInputExpression };

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(new Error(e?.error ?? `trace-service error ${r.status}`)));
        return r.json();
      })
      .then((data) => {
        if (!data.success) throw new Error(data.error ?? "trace-service returned failure");
        setRoot((data.root as TraceNode | undefined) ?? null);
        setResultValue(data.result as SpecValue | undefined);
        set({
          effectiveAlgoId: (data.effectiveAlgoId as string | undefined) ?? null,
          detectedOperator: (data.detectedOperator as string | undefined) ?? null,
        });
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Unknown executor error";
        setError(msg);
        setRoot(null);
        setResultValue(undefined);
        set({ effectiveAlgoId: null, detectedOperator: null });
      });
  },
}));
