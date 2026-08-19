export enum EngineKey {
  v8 = "v8",
  sm = "sm",
  hermes = "hermes",
  jsc = "jsc",
}

export const ENGINE_KEYS: readonly EngineKey[] = [EngineKey.v8, EngineKey.sm, EngineKey.hermes, EngineKey.jsc];
export const isEngineKey = (value: unknown): value is EngineKey =>
  typeof value === "string" && (ENGINE_KEYS as readonly string[]).includes(value);

export const DEFAULT_ENGINES: readonly EngineKey[] = [EngineKey.v8];

export const createEngineSelection = (on: readonly EngineKey[] = DEFAULT_ENGINES): Record<EngineKey, boolean> =>
  Object.fromEntries(ENGINE_KEYS.map((engine) => [engine, on.includes(engine)])) as Record<EngineKey, boolean>;

export const selectionFrom = createEngineSelection;

export const enabledEngines = (selection: Record<EngineKey, boolean>): EngineKey[] =>
  ENGINE_KEYS.filter((engine) => selection[engine]);

/**
 * Engine flags the user picked, per engine. Every engine accepts flags (the
 * gateway sanitizes them against the same catalog for all four), so this is a
 * map rather than the single V8 list the UI used to carry.
 */
export type EngineFlags = Partial<Record<EngineKey, string[]>>;

/** Flags for one engine, safe to spread into a run request. */
export const flagsFor = (flags: EngineFlags, engine: EngineKey): string[] => flags[engine] ?? [];

/** Total number of flags selected across every engine. */
export const flagCount = (flags: EngineFlags): number =>
  ENGINE_KEYS.reduce((total, engine) => total + (flags[engine]?.length ?? 0), 0);

export type EngineResult = { stdout: string; stderr: string; ms?: number };

export enum RunStatus {
  idle = "idle",
  running = "running",
  done = "done",
  error = "error",
}

export enum DiffKind {
  Keep = "keep",
  Add = "add",
  Del = "del",
}

export type ChangeAdd = { type: DiffKind.Add; line: string; nextLine: number };
export type ChangeDel = { type: DiffKind.Del; line: string; prevLine: number };
export type ChangeText = { type: DiffKind.Keep; line: string; prevLine: number; nextLine: number };
export type Change = ChangeText | ChangeDel | ChangeAdd;

export type DiffResult = {
  added: { line: string; nextLine: number }[];
  deleted: { line: string; prevLine: number }[];
  changes: Change[];
};
