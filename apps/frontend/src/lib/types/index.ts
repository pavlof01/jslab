export enum EngineKey {
  v8 = "v8",
  sm = "sm",
  hermes = "hermes",
  jsc = "jsc",
}

export const ENGINE_KEYS: readonly EngineKey[] = [EngineKey.v8, EngineKey.sm, EngineKey.hermes, EngineKey.jsc];
export const isEngineKey = (value: unknown): value is EngineKey =>
  typeof value === "string" && (ENGINE_KEYS as readonly string[]).includes(value);

/**
 * A fresh engine-selection record with the playground's default: V8 on, the
 * rest off. Lives here rather than in the store so the store and the UI cannot
 * disagree about which engines exist or which one is on by default.
 */
export const createEngineSelection = (): Record<EngineKey, boolean> => ({
  [EngineKey.v8]: true,
  [EngineKey.sm]: false,
  [EngineKey.hermes]: false,
  [EngineKey.jsc]: false,
});

/**
 * One engine's output as the playground store holds it. The wire shape lives in
 * `lib/api.ts` (`RunResult`); this is what survives into the UI.
 */
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
