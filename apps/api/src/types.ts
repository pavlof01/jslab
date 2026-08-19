export type EngineKind = "v8" | "hermes" | "sm" | "jsc";

export type RunRequest = {
  engine: EngineKind;
  sourceText: string;
  options?: {
    flags?: string[];
    timeoutMs?: number;
  };
};

export type TraceExecuteInput =
  | string
  | number
  | boolean
  | null
  | unknown[]
  | Record<string, unknown>;

export type TraceExecuteRequest = {
  functionName: string;
  input: TraceExecuteInput;
  preferredType?: "string" | "number";
};

export type NormalizedRunRequest = {
  engine: EngineKind;
  sourceText: string;
  flags: string[];
  timeoutMs: number;
  /**
   * Flags the allowlist rejected. Reported back to the caller but deliberately
   * kept out of the cache key: the run is identical whatever junk was dropped.
   */
  droppedFlags: string[];
};

export type Artifact = {
  kind: "bytecode";
  mime: string;
  dataBase64: string;
};

export type EngineResponse = {
  ok: boolean;
  stdout: string;
  stderr: string;
  artifacts: Artifact[];
  meta?: Record<string, unknown>;
};

export type ApiResponse = EngineResponse & {
  meta: {
    durationMs: number;
    engine: EngineKind;
    cacheHit: boolean;
  } & Record<string, unknown>;
};
