import { z } from "zod";
import type { EngineKind, RunRequest, TaskKind, TraceExecuteInput, TraceExecuteRequest } from "./types.js";

const engineFlags: Record<EngineKind, readonly string[]> = {
  v8: [
    "--print-bytecode",
    "--trace-ignition",
    "--trace-deopt",
    "--allow-natives-syntax",
    "--no-liftoff",
    "--no-wasm-async-compilation",
  ],
  hermes: ["-O", "-gc-sanitize-handles", "-strict"],
  sm: ["--baseline-eager", "--ion-eager"],
  jsc: ["-d"],
};

export function allowedFlags(engine: EngineKind): readonly string[] {
  return engineFlags[engine];
}

export const runRequestSchema: z.ZodType<RunRequest> = z.object({
  engine: z.enum(["v8", "hermes", "sm", "jsc"]),
  task: z.enum(["run", "bytecode"]),
  sourceText: z.string().min(1),
  options: z
    .object({
      flags: z.array(z.string()).optional(),
      timeoutMs: z.number().int().positive().optional(),
    })
    .optional(),
});

export const normalizedOptionsSchema = z.object({
  flags: z.array(z.string()),
  timeoutMs: z.number().int().positive(),
});

const traceExecuteInputSchema: z.ZodType<TraceExecuteInput> = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.unknown()),
  z.record(z.unknown()),
]);

export const traceExecuteRequestSchema: z.ZodType<TraceExecuteRequest> = z.object({
  functionName: z.string().min(1),
  input: traceExecuteInputSchema,
  preferredType: z.enum(["string", "number"]).optional(),
});

export function normalizeFlags(engine: EngineKind, flags: string[], maxFlags: number): string[] {
  const allow = new Set(engineFlags[engine]);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of flags.slice(0, maxFlags)) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed.startsWith("-")) continue;
    if (!allow.has(trimmed)) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  out.sort();
  return out;
}
