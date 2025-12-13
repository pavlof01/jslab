export type EngineKind = "v8" | "hermes";
export type TaskKind = "run" | "bytecode";

export type RunRequest = {
  engine: EngineKind;
  task: TaskKind;
  sourceText: string;
  options?: {
    flags?: string[];
    timeoutMs?: number;
  };
};

export type NormalizedRunRequest = {
  engine: EngineKind;
  task: TaskKind;
  sourceText: string;
  flags: string[];
  timeoutMs: number;
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
