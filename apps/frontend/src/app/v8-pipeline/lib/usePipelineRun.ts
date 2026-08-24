"use client";

import { useCallback, useMemo, useState } from "react";

import { type RunFailure, runEngine } from "@/lib/api";
import { pickPrimaryFailure } from "@/lib/runAggregate";
import { describeRunFailure } from "@/lib/runMessages";
import { EngineKey } from "@/lib/types";
import { API_STAGES, type ApiStageId, type StageId, stripDiagnostics } from "./stages";
import { type Token, tokenize } from "./tokenize";

export interface StageOutput {
  loading: boolean;
  stdout: string;
  stderr: string;
}

export type StageStatus = "idle" | "loading" | "ok" | "empty" | "error";

const EMPTY_OUTPUT: StageOutput = { loading: false, stdout: "", stderr: "" };

const emptyOutputs = (): Record<ApiStageId, StageOutput> =>
  Object.fromEntries(API_STAGES.map((stage) => [stage.id, EMPTY_OUTPUT])) as Record<
    ApiStageId,
    StageOutput
  >;

export function usePipelineRun(code: string) {
  const [hasRun, setHasRun] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [tokens, setTokens] = useState<Token[]>([]);
  const [outputs, setOutputs] = useState<Record<ApiStageId, StageOutput>>(emptyOutputs);

  const visibleTokens = useMemo(
    () => tokens.filter((token) => token.kind !== "Whitespace"),
    [tokens],
  );

  const patch = useCallback((id: ApiStageId, change: Partial<StageOutput>) => {
    setOutputs((previous) => ({ ...previous, [id]: { ...previous[id], ...change } }));
  }, []);

  const analyze = useCallback(async () => {
    setRunning(true);
    setHasRun(true);
    setError("");
    setTokens(tokenize(code));

    for (const stage of API_STAGES) patch(stage.id, { loading: true, stdout: "", stderr: "" });

    try {
      const failures: RunFailure[] = [];
      await Promise.all(
        API_STAGES.map(async ({ id, flags }) => {
          const result = await runEngine(EngineKey.v8, code, { flags });
          if (result.failure) failures.push(result.failure);
          patch(id, {
            loading: false,
            stdout: stripDiagnostics(result.stdout),
            stderr: stripDiagnostics(result.stderr),
          });
        }),
      );

      const failure = pickPrimaryFailure(failures);
      if (failure) setError(describeRunFailure(failure));
    } finally {
      setOutputs(
        (previous) =>
          Object.fromEntries(
            Object.entries(previous).map(([id, output]) => [
              id,
              output.loading ? { ...output, loading: false } : output,
            ]),
          ) as Record<ApiStageId, StageOutput>,
      );
      setRunning(false);
    }
  }, [code, patch]);

  const statusOf = useCallback(
    (id: StageId): StageStatus => {
      if (!hasRun) return "idle";
      if (id === "tokens") return tokens.length > 0 ? "ok" : "empty";

      const output = outputs[id as ApiStageId];
      if (output.loading) return "loading";
      if (output.stderr && !output.stdout) return "error";
      if (output.stdout) return "ok";
      return "empty";
    },
    [hasRun, outputs, tokens.length],
  );

  return { hasRun, running, error, outputs, visibleTokens, analyze, statusOf };
}
