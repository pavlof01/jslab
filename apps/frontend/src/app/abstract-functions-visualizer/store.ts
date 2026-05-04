import { create } from "zustand";
import type { SpecValue, TraceStep } from "@/app/abstract-functions-visualizer/spec-runner";

const DEFAULT_ALGO = "ToNumber";
const DEFAULT_INPUT = '{ valueOf: () => "1" }';

interface VisualizerStore {
  // ── Trace ──────────────────────────────────────────────────────────────────
  trace: TraceStep[];
  resultValue: SpecValue | undefined;
  error: string | null;
  showSkipped: boolean;

  // ── Spec panel ─────────────────────────────────────────────────────────────
  specHtml: string;
  specDrawerOpen: boolean;

  // ── Input ──────────────────────────────────────────────────────────────────
  selectedAlgo: string;
  traceInputRaw: string;
  traceInputExpression: string;

  // ── Playback ───────────────────────────────────────────────────────────────
  selectedIndex: number;
  isPlaying: boolean;

  // ── Collapse state ─────────────────────────────────────────────────────────
  collapsedBlocks: Record<number, boolean>;

  // ── Derived ────────────────────────────────────────────────────────────────
  maxIndex: () => number;

  // ── Actions ────────────────────────────────────────────────────────────────
  setTrace: (trace: TraceStep[]) => void;
  setResultValue: (v: SpecValue | undefined) => void;
  setError: (e: string | null) => void;
  setShowSkipped: (v: boolean) => void;
  setSpecHtml: (html: string) => void;
  setSpecDrawerOpen: (open: boolean) => void;
  setSelectedAlgo: (algo: string) => void;
  setTraceInputRaw: (v: string) => void;
  commitTraceInput: (v: string) => void;
  setIsPlaying: (v: boolean | ((prev: boolean) => boolean)) => void;
  toggleBlock: (callStepIndex: number) => void;
  onSelectIndex: (i: number) => void;
  tickPlayback: () => void;
  runNow: () => void;
}

export const useVisualizerStore = create<VisualizerStore>((set, get) => ({
  trace: [],
  resultValue: undefined,
  error: null,
  showSkipped: true,
  specHtml: "",
  specDrawerOpen: false,
  selectedAlgo: DEFAULT_ALGO,
  traceInputRaw: DEFAULT_INPUT,
  traceInputExpression: DEFAULT_INPUT,
  selectedIndex: 0,
  isPlaying: false,
  collapsedBlocks: {},

  maxIndex: () => Math.max(0, get().trace.length - 1),

  setTrace: (trace) => set({ trace, selectedIndex: 0, collapsedBlocks: {} }),

  setResultValue: (resultValue) => set({ resultValue }),
  setError: (error) => set({ error }),
  setShowSkipped: (showSkipped) => set({ showSkipped }),
  setSpecHtml: (specHtml) => set({ specHtml }),
  setSpecDrawerOpen: (specDrawerOpen) => set({ specDrawerOpen }),
  setSelectedAlgo: (selectedAlgo) => set({ selectedAlgo }),
  setTraceInputRaw: (traceInputRaw) => set({ traceInputRaw }),
  commitTraceInput: (traceInputExpression) => set({ traceInputExpression }),

  setIsPlaying: (v) =>
    set((s) => ({ isPlaying: typeof v === "function" ? v(s.isPlaying) : v })),

  toggleBlock: (callStepIndex) =>
    set((s) => ({
      collapsedBlocks: {
        ...s.collapsedBlocks,
        [callStepIndex]: !s.collapsedBlocks[callStepIndex],
      },
    })),

  onSelectIndex: (i) => {
    const max = get().maxIndex();
    set({ isPlaying: false, selectedIndex: Math.max(0, Math.min(max, i)) });
  },

  tickPlayback: () => {
    const { selectedIndex, trace, setIsPlaying } = get();
    if (selectedIndex >= trace.length - 1) {
      setIsPlaying(false);
    } else {
      set({ selectedIndex: selectedIndex + 1 });
    }
  },

  runNow: () => {
    const { selectedAlgo, traceInputExpression, setIsPlaying, setError, setTrace, setResultValue } = get();
    setIsPlaying(false);
    setError(null);

    fetch("/api/trace/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ functionName: selectedAlgo, input: traceInputExpression }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(new Error(e?.error ?? `trace-service error ${r.status}`)));
        return r.json();
      })
      .then((data) => {
        if (!data.success) throw new Error(data.error ?? "trace-service returned failure");
        setTrace(data.steps);
        setResultValue(data.result as SpecValue);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Unknown executor error";
        setError(msg);
        setTrace([]);
        setResultValue(undefined);
      });
  },
}));
