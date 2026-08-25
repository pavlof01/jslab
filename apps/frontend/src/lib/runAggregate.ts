import type { RunFailure, RunResult } from "@/lib/api";
import { ENGINE_KEYS, type EngineKey, type EngineResult } from "@/lib/types";

export function pickPrimaryFailure(failures: readonly RunFailure[]): RunFailure | undefined {
  return failures.find((failure) => failure.status === 429) ?? failures[0];
}

const EMPTY_RESULT: EngineResult = { stdout: "", stderr: "" };

export const createEmptyOut = (): Record<EngineKey, EngineResult> =>
  Object.fromEntries(ENGINE_KEYS.map((engine) => [engine, { ...EMPTY_RESULT }])) as Record<
    EngineKey,
    EngineResult
  >;

export const cloneOut = (out: Record<EngineKey, EngineResult>): Record<EngineKey, EngineResult> =>
  Object.fromEntries(
    ENGINE_KEYS.map((engine) => [engine, { ...(out[engine] ?? EMPTY_RESULT) }]),
  ) as Record<EngineKey, EngineResult>;

export interface RunAggregate {
  out: Record<EngineKey, EngineResult>;
  durationMs: number;
  cacheHit: boolean;
  outputTruncated: boolean;
  droppedFlags: string[];
  failure?: RunFailure;
  allFailed: boolean;
}

export function aggregateRunResults(
  settled: ReadonlyArray<readonly [EngineKey, RunResult]>,
): RunAggregate {
  const out = createEmptyOut();
  const failures: RunFailure[] = [];
  const droppedFlags = new Set<string>();
  let outputTruncated = false;
  let durationMs = 0;
  let cacheHit = settled.length > 0;

  for (const [engine, result] of settled) {
    out[engine] = result;
    durationMs = Math.max(durationMs, result.ms ?? 0);
    if (result.failure) failures.push(result.failure);
    if (!result.cacheHit) cacheHit = false;
    if (result.outputTruncated) outputTruncated = true;
    for (const flag of result.droppedFlags ?? []) droppedFlags.add(flag);
  }

  return {
    out,
    durationMs,
    cacheHit,
    outputTruncated,
    droppedFlags: [...droppedFlags],
    failure: pickPrimaryFailure(failures),
    allFailed: settled.length > 0 && failures.length === settled.length,
  };
}
