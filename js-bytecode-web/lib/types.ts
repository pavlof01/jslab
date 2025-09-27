export type EngineKey = "v8" | "sm" | "hermes" | "jsc";
export type EngineResult = { exitCode: number | null; stdout: string; stderr: string; ms?: number };
export type ApiResponse = {
  ok: boolean;
  results?: Record<string, EngineResult>;
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
export type RunStatus = "idle" | "running" | "done" | "error";
export type SampleDescriptor = { key: string; label: string; description: string };
export type V8FlagOption = {
  flag: string;
  label: string;
  description: string;
  defaultSelected: boolean;
};
