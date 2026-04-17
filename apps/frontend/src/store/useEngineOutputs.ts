import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { ENGINE_KEYS, EngineKey, RunStatus, type EngineResult } from "@/lib/types";
import { samples } from "@/lib/samples";

const DEFAULT_ENGINE_OUT: EngineResult = { exitCode: null, stdout: "", stderr: "" };

export const createEmptyOut = (): Record<EngineKey, EngineResult> =>
  Object.fromEntries(ENGINE_KEYS.map((engine) => [engine, { ...DEFAULT_ENGINE_OUT }])) as Record<
    EngineKey,
    EngineResult
  >;

const cloneOut = (out: Record<EngineKey, EngineResult>): Record<EngineKey, EngineResult> =>
  Object.fromEntries(ENGINE_KEYS.map((engine) => [engine, { ...(out[engine] ?? DEFAULT_ENGINE_OUT) }])) as Record<
    EngineKey,
    EngineResult
  >;

const createEngineSelection = (): Record<EngineKey, boolean> => ({
  [EngineKey.v8]: true,
  [EngineKey.sm]: false,
  [EngineKey.hermes]: false,
  [EngineKey.jsc]: false,
});

type RunContext = {
  engines: EngineKey[];
  activeTab: EngineKey;
  code: string;
  v8Flags: string[];
  timestamp: number;
};

export type RunRequest = {
  code: string;
  engines: EngineKey[];
  v8Flags: string[];
  activeTab: EngineKey;
};

type PreviousRunSnapshot = RunContext & { out: Record<EngineKey, EngineResult> };

interface EngineOutputsState {
  out: Record<EngineKey, EngineResult>;
  status: RunStatus;
  meta: string;
  showDiff: boolean;
  error?: string;
  previousSnapshot: PreviousRunSnapshot | null;
  currentRun: RunContext | null;
  code: string;
  engines: Record<EngineKey, boolean>;
  activeTab: EngineKey;
  selectedV8Flags: string[];
}

interface EngineOutputsActions {
  runEngines: (request: RunRequest) => Promise<void>;
  reset: () => void;
  setShowDiff: (value: boolean) => void;
  toggleDiff: () => void;
  clearPreviousSnapshot: () => void;
  updateCurrentRunActiveTab: (activeTab: EngineKey) => void;
  setOut: (next: Record<EngineKey, EngineResult>) => void;
  setMeta: (meta: string) => void;
  setStatus: (status: RunStatus) => void;
  setCode: (code: string) => void;
  setEngines: (engines: Record<EngineKey, boolean>) => void;
  setActiveTab: (activeTab: EngineKey) => void;
  setSelectedV8Flags: (flags: string[]) => void;
}

const createInitialState = (): EngineOutputsState => ({
  out: createEmptyOut(),
  status: RunStatus.idle,
  meta: "",
  showDiff: true,
  error: undefined,
  previousSnapshot: null,
  currentRun: null,
  code: samples.add,
  engines: createEngineSelection(),
  activeTab: EngineKey.v8,
  selectedV8Flags: [],
});

type EngineOutputsStore = EngineOutputsState & EngineOutputsActions;

export const useEngineOutputsStore = create<EngineOutputsStore>((set, get) => ({
  ...createInitialState(),

  setOut: (next) => set({ out: next }),
  setMeta: (meta) => set({ meta }),
  setStatus: (status) => set({ status }),
  setShowDiff: (value) => set({ showDiff: value }),
  toggleDiff: () => set((state) => ({ showDiff: !state.showDiff })),
  clearPreviousSnapshot: () => set({ previousSnapshot: null }),
  reset: () => set({ ...createInitialState() }),
  setCode: (code) => set({ code }),
  setEngines: (engines) => set({ engines }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSelectedV8Flags: (flags) => set({ selectedV8Flags: flags }),

  updateCurrentRunActiveTab: (activeTab) =>
    set((state) => {
      if (!state.currentRun || state.currentRun.activeTab === activeTab) {
        return state;
      }
      return { currentRun: { ...state.currentRun, activeTab } };
    }),

  runEngines: async ({ code, engines, v8Flags, activeTab }) => {
    const runTimestamp = Date.now();
    const previousState = get();

    if (previousState.currentRun) {
      set({
        previousSnapshot: {
          out: cloneOut(previousState.out),
          engines: [...previousState.currentRun.engines],
          activeTab: previousState.currentRun.activeTab,
          code: previousState.currentRun.code,
          v8Flags: [...previousState.currentRun.v8Flags],
          timestamp: previousState.currentRun.timestamp,
        },
      });
    }

    set({
      status: RunStatus.running,
      meta: "",
      error: undefined,
      out: createEmptyOut(),
    });

    try {
      const tasks = engines.map(async (engine) => {
        try {
          const response = await fetch("/api/run", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              engine,
              sourceText: code,
              options: engine === EngineKey.v8 ? { flags: v8Flags } : {},
            }),
          });

          const payload = await response.json().catch(() => null);
          if (!response.ok || !payload?.ok) {
            return [
              engine,
              {
                exitCode: null,
                stdout: (payload?.stdout ?? "").trim(),
                stderr: (payload?.error ?? payload?.stderr ?? `http ${response.status}`).trim(),
                ms: payload?.meta?.durationMs ?? 0,
              },
            ] as const;
          }

          return [
            engine,
            {
              exitCode: null,
              stdout: (payload.stdout ?? "").trim(),
              stderr: (payload.stderr ?? "").trim(),
              ms: payload.meta?.durationMs ?? 0,
            },
          ] as const;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return [engine, { exitCode: null, stdout: "", stderr: message, ms: 0 }] as const;
        }
      });

      const settled = await Promise.all(tasks);
      const nextOut = createEmptyOut();
      let maxMs = 0;

      for (const [engine, result] of settled) {
        nextOut[engine] = result;
        maxMs = Math.max(maxMs, result.ms ?? 0);
      }

      set({
        out: nextOut,
        meta: maxMs ? `Duration: ${maxMs} ms` : "",
        status: RunStatus.done,
        currentRun: {
          engines: [...engines],
          activeTab,
          code,
          v8Flags: [...v8Flags],
          timestamp: runTimestamp,
        },
        error: undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      set({
        status: RunStatus.error,
        meta: message,
        error: message,
      });
      throw error;
    }
  },
}));

export const engineOutputsSelectors = {
  out: (state: EngineOutputsState) => state.out,
  status: (state: EngineOutputsState) => state.status,
  meta: (state: EngineOutputsState) => state.meta,
  error: (state: EngineOutputsState) => state.error,
  previousSnapshot: (state: EngineOutputsState) => state.previousSnapshot,
  currentRun: (state: EngineOutputsState) => state.currentRun,
};

export const useEngineOutputsState = () =>
  useEngineOutputsStore(
    useShallow((state) => ({
      out: state.out,
      status: state.status,
      meta: state.meta,
      showDiff: state.showDiff,
      error: state.error,
      previousSnapshot: state.previousSnapshot,
      currentRun: state.currentRun,
      code: state.code,
      engines: state.engines,
      activeTab: state.activeTab,
      selectedV8Flags: state.selectedV8Flags,
    }))
  );

export const useEngineOutputsActions = () =>
  useEngineOutputsStore(
    useShallow((state) => ({
      runEngines: state.runEngines,
      reset: state.reset,
      setShowDiff: state.setShowDiff,
      toggleDiff: state.toggleDiff,
      clearPreviousSnapshot: state.clearPreviousSnapshot,
      updateCurrentRunActiveTab: state.updateCurrentRunActiveTab,
      setOut: state.setOut,
      setMeta: state.setMeta,
      setStatus: state.setStatus,
      setCode: state.setCode,
      setEngines: state.setEngines,
      setActiveTab: state.setActiveTab,
      setSelectedV8Flags: state.setSelectedV8Flags,
    }))
  );

export type { EngineOutputsState, EngineOutputsActions, RunContext, PreviousRunSnapshot };
