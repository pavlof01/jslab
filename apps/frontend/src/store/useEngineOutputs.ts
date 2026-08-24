import { create } from "zustand";
import { runEngine } from "@/lib/api";
import { aggregateRunResults, cloneOut, createEmptyOut } from "@/lib/runAggregate";
import { describeRunFailure, describeRunNotice } from "@/lib/runMessages";
import { samples } from "@/lib/samples";
import {
  createEngineSelection,
  ENGINE_KEYS,
  type EngineFlags,
  EngineKey,
  type EngineResult,
  enabledEngines,
  flagsFor,
  RunStatus,
} from "@/lib/types";

let latestRunToken = 0;

type RunContext = {
  engines: EngineKey[];
  code: string;
  flags: EngineFlags;
  timestamp: number;
};

export type RunRequest = {
  code?: string;
  engines?: EngineKey[];
  flags?: EngineFlags;
};

export type RunOutcome = "done" | "failed" | "empty" | "superseded";

type PreviousRunSnapshot = RunContext & { out: Record<EngineKey, EngineResult> };

interface EngineOutputsState {
  out: Record<EngineKey, EngineResult>;
  status: RunStatus;
  durationMs: number;
  cacheHit: boolean;
  showDiff: boolean;
  error?: string;
  /** Non-fatal warning about a run that succeeded: truncated output, ignored flags. */
  notice?: string;
  previousSnapshot: PreviousRunSnapshot | null;
  currentRun: RunContext | null;
  code: string;
  engines: Record<EngineKey, boolean>;
  activeTab: EngineKey;
  /** Flags picked per engine; the gateway accepts them for all four. */
  flags: EngineFlags;
}

interface EngineOutputsActions {
  runEngines: (request?: RunRequest) => Promise<RunOutcome>;
  reset: () => void;
  setShowDiff: (value: boolean) => void;
  toggleDiff: () => void;
  clearPreviousSnapshot: () => void;
  setCode: (code: string) => void;
  setEngines: (engines: Record<EngineKey, boolean>) => void;
  setActiveTab: (activeTab: EngineKey) => void;
  setEngineFlags: (engine: EngineKey, flags: string[]) => void;
  setFlags: (flags: EngineFlags) => void;
}

const createInitialState = (): EngineOutputsState => ({
  out: createEmptyOut(),
  status: RunStatus.idle,
  durationMs: 0,
  cacheHit: false,
  showDiff: true,
  error: undefined,
  notice: undefined,
  previousSnapshot: null,
  currentRun: null,
  code: samples.add,
  engines: createEngineSelection(),
  activeTab: EngineKey.v8,
  flags: { [EngineKey.v8]: ["--print-bytecode", "--allow-natives-syntax"] },
});

type EngineOutputsStore = EngineOutputsState & EngineOutputsActions;

export const useEngineOutputsStore = create<EngineOutputsStore>((set, get) => ({
  ...createInitialState(),

  setShowDiff: (value) => set({ showDiff: value }),
  toggleDiff: () => set((state) => ({ showDiff: !state.showDiff })),
  clearPreviousSnapshot: () => set({ previousSnapshot: null }),
  reset: () => set({ ...createInitialState() }),
  setCode: (code) => set({ code }),
  setEngines: (engines) =>
    set((state) => {
      if (engines[state.activeTab]) return { engines };
      return { engines, activeTab: ENGINE_KEYS.find((key) => engines[key]) ?? EngineKey.v8 };
    }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setEngineFlags: (engine, engineFlags) =>
    set((state) => ({ flags: { ...state.flags, [engine]: engineFlags } })),
  setFlags: (flags) => set({ flags }),

  runEngines: async ({ code: codeArg, engines: enginesArg, flags: flagsArg } = {}) => {
    const runTimestamp = Date.now();
    const runToken = ++latestRunToken;
    const previousState = get();
    const code = codeArg ?? previousState.code;
    const engines = enginesArg ?? enabledEngines(previousState.engines);
    const flags = flagsArg ?? previousState.flags;

    if (!code.trim()) {
      set({
        status: RunStatus.error,
        durationMs: 0,
        cacheHit: false,
        notice: undefined,
        error: "Nothing to run — the editor is empty.",
      });
      return "empty";
    }

    set({
      status: RunStatus.running,
      durationMs: 0,
      cacheHit: false,
      error: undefined,
      notice: undefined,
      out: createEmptyOut(),
      previousSnapshot: previousState.currentRun
        ? {
            out: cloneOut(previousState.out),
            engines: [...previousState.currentRun.engines],
            code: previousState.currentRun.code,
            flags: { ...previousState.currentRun.flags },
            timestamp: previousState.currentRun.timestamp,
          }
        : previousState.previousSnapshot,
    });

    try {
      const settled = await Promise.all(
        engines.map(async (engine) => {
          const options = { flags: flagsFor(flags, engine) };
          return [engine, await runEngine(engine, code, options)] as const;
        }),
      );
      if (runToken !== latestRunToken) return "superseded";

      const summary = aggregateRunResults(settled);

      set({
        out: summary.out,
        durationMs: summary.durationMs,
        cacheHit: summary.cacheHit,
        status: summary.allFailed ? RunStatus.error : RunStatus.done,
        currentRun: { engines: [...engines], code, flags: { ...flags }, timestamp: runTimestamp },
        error: summary.failure ? describeRunFailure(summary.failure) : undefined,
        notice: describeRunNotice(summary.outputTruncated, summary.droppedFlags),
      });

      return summary.allFailed ? "failed" : "done";
    } catch (error) {
      if (runToken !== latestRunToken) return "superseded";
      set({
        status: RunStatus.error,
        durationMs: 0,
        cacheHit: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return "failed";
    }
  },
}));

export type { EngineOutputsActions, EngineOutputsState, PreviousRunSnapshot, RunContext };
