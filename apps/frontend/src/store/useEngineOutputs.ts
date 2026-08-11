import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { createEngineSelection, ENGINE_KEYS, EngineKey, RunStatus, type EngineResult } from "@/lib/types";
import { describeRunFailure, runEngine, type RunFailure } from "@/lib/api";
import { samples } from "@/lib/samples";

// Monotonic run token. Runs resolve out of order (a slow engine from run N can
// land after run N+1 finished), so only the newest token may write results.
let latestRunToken = 0;

/** Warning line for a run that produced output but not the output asked for. */
function describeRunNotice(truncated: boolean, droppedFlags: string[]): string | undefined {
  const parts: string[] = [];
  if (truncated) parts.push("Output hit the size cap and is truncated.");
  if (droppedFlags.length) {
    parts.push(
      `${droppedFlags.length === 1 ? "Flag" : "Flags"} ignored by this engine: ${droppedFlags.join(", ")}.`,
    );
  }
  return parts.length ? parts.join(" ") : undefined;
}

const DEFAULT_ENGINE_OUT: EngineResult = { stdout: "", stderr: "" };

const createEmptyOut = (): Record<EngineKey, EngineResult> =>
  Object.fromEntries(ENGINE_KEYS.map((engine) => [engine, { ...DEFAULT_ENGINE_OUT }])) as Record<
    EngineKey,
    EngineResult
  >;

const cloneOut = (out: Record<EngineKey, EngineResult>): Record<EngineKey, EngineResult> =>
  Object.fromEntries(ENGINE_KEYS.map((engine) => [engine, { ...(out[engine] ?? DEFAULT_ENGINE_OUT) }])) as Record<
    EngineKey,
    EngineResult
  >;

type RunContext = {
  engines: EngineKey[];
  code: string;
  v8Flags: string[];
  timestamp: number;
};

export type RunRequest = {
  code?: string;
  engines?: EngineKey[];
  v8Flags?: string[];
};

type PreviousRunSnapshot = RunContext & { out: Record<EngineKey, EngineResult> };

interface EngineOutputsState {
  out: Record<EngineKey, EngineResult>;
  status: RunStatus;
  meta: string;
  showDiff: boolean;
  error?: string;
  /** Non-fatal warning about a run that succeeded: truncated output, ignored flags. */
  notice?: string;
  previousSnapshot: PreviousRunSnapshot | null;
  currentRun: RunContext | null;
  code: string;
  engines: Record<EngineKey, boolean>;
  activeTab: EngineKey;
  selectedV8Flags: string[];
}

interface EngineOutputsActions {
  runEngines: (request?: RunRequest) => Promise<void>;
  reset: () => void;
  setShowDiff: (value: boolean) => void;
  toggleDiff: () => void;
  clearPreviousSnapshot: () => void;
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
  notice: undefined,
  previousSnapshot: null,
  currentRun: null,
  code: samples.add,
  engines: createEngineSelection(),
  activeTab: EngineKey.v8,
  selectedV8Flags: ["--print-bytecode", "--allow-natives-syntax"],
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

  runEngines: async ({ code: codeArg, engines: enginesArg, v8Flags: v8FlagsArg } = {}) => {
    const runTimestamp = Date.now();
    const runToken = ++latestRunToken;
    const previousState = get();
    const code = codeArg ?? previousState.code;
    const engines = enginesArg ?? Object.entries(previousState.engines).filter(([, v]) => v).map(([k]) => k as EngineKey);
    const v8Flags = v8FlagsArg ?? previousState.selectedV8Flags;

    // The API rejects an empty sourceText with a 400; say so here instead of
    // spending a request (and a rate-limit slot) to be told.
    if (!code.trim()) {
      set({ status: RunStatus.error, meta: "", notice: undefined, error: "Nothing to run — the editor is empty." });
      return;
    }

    if (previousState.currentRun) {
      set({
        previousSnapshot: {
          out: cloneOut(previousState.out),
          engines: [...previousState.currentRun.engines],
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
      notice: undefined,
      out: createEmptyOut(),
    });

    try {
      const tasks = engines.map(async (engine) => {
        const options = engine === EngineKey.v8 ? { flags: v8Flags } : {};
        const result = await runEngine(engine, code, options);
        return [engine, result] as const;
      });

      const settled = await Promise.all(tasks);
      if (runToken !== latestRunToken) return;

      const nextOut = createEmptyOut();
      const failures: RunFailure[] = [];
      const droppedFlags = new Set<string>();
      let truncated = false;
      let maxMs = 0;
      let allCached = settled.length > 0;

      for (const [engine, result] of settled) {
        nextOut[engine] = result;
        maxMs = Math.max(maxMs, result.ms ?? 0);
        if (result.failure) failures.push(result.failure);
        if (!result.cacheHit) allCached = false;
        if (result.outputTruncated) truncated = true;
        for (const flag of result.droppedFlags ?? []) droppedFlags.add(flag);
      }

      // A 429 is the actionable one (it tells the user to wait), so let it win
      // over a generic 502 from a second engine in the same run.
      const failure = failures.find((f) => f.status === 429) ?? failures[0];
      const allFailed = failures.length === settled.length && settled.length > 0;

      set({
        out: nextOut,
        meta: maxMs ? `Duration: ${maxMs} ms${allCached ? " · cached" : ""}` : "",
        status: allFailed ? RunStatus.error : RunStatus.done,
        currentRun: {
          engines: [...engines],
          code,
          v8Flags: [...v8Flags],
          timestamp: runTimestamp,
        },
        error: failure ? describeRunFailure(failure) : undefined,
        // A truncated dump reads as a complete one, and a rejected flag reads
        // as "the engine printed nothing" — both need saying out loud.
        notice: describeRunNotice(truncated, [...droppedFlags]),
      });
    } catch (error) {
      if (runToken !== latestRunToken) return;
      const message = error instanceof Error ? error.message : "Unknown error";
      set({
        status: RunStatus.error,
        meta: "",
        error: message,
      });
      throw error;
    }
  },
}));

export const useEngineOutputsState = () =>
  useEngineOutputsStore(
    useShallow((state) => ({
      out: state.out,
      status: state.status,
      meta: state.meta,
      showDiff: state.showDiff,
      error: state.error,
      notice: state.notice,
      previousSnapshot: state.previousSnapshot,
      currentRun: state.currentRun,
      code: state.code,
      engines: state.engines,
      activeTab: state.activeTab,
      selectedV8Flags: state.selectedV8Flags,
    })),
  );

export const useEngineOutputsActions = () =>
  useEngineOutputsStore(
    useShallow((state) => ({
      runEngines: state.runEngines,
      reset: state.reset,
      setShowDiff: state.setShowDiff,
      toggleDiff: state.toggleDiff,
      clearPreviousSnapshot: state.clearPreviousSnapshot,
      setOut: state.setOut,
      setMeta: state.setMeta,
      setStatus: state.setStatus,
      setCode: state.setCode,
      setEngines: state.setEngines,
      setActiveTab: state.setActiveTab,
      setSelectedV8Flags: state.setSelectedV8Flags,
    })),
  );

export type { EngineOutputsState, EngineOutputsActions, RunContext, PreviousRunSnapshot };
