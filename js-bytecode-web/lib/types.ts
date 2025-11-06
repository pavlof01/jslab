export enum EngineKey {
  v8 = "v8",
  sm = "sm",
  hermes = "hermes",
  jsc = "jsc",
}

export const ENGINE_KEYS: readonly EngineKey[] = [EngineKey.v8, EngineKey.sm, EngineKey.hermes, EngineKey.jsc];
export const isEngineKey = (value: unknown): value is EngineKey =>
  typeof value === "string" && (ENGINE_KEYS as readonly string[]).includes(value);

export type EngineResult = { exitCode: number | null; stdout: string; stderr: string; ms?: number };
export type ApiResponse = {
  ok: boolean;
  results?: Partial<Record<EngineKey, EngineResult>>;
  meta?: { ms: number };
  error?: string;
};
export type VersionInfo = {
  ok: boolean;
  short?: string;
  raw?: string;
  exitCode?: number | null;
  error?: string;
};
export type VersionsResp = { ok: boolean; engines: Record<EngineKey, VersionInfo> };
export enum RunStatus {
  idle = "idle",
  running = "running",
  done = "done",
  error = "error",
}
export type V8FlagOption = {
  flag: string;
  label: string;
  description: string;
};
