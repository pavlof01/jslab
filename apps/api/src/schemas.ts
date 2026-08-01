import { z } from "zod";
import type { EngineKind, RunRequest, TraceExecuteInput, TraceExecuteRequest } from "./types.js";

const engineFlags: Record<EngineKind, readonly string[]> = {
  v8: [
    "--allow-natives-syntax",
    "--no-liftoff",
    "--no-wasm-async-compilation",
    "--print-all-code",
    "--print-all-exceptions",
    "--print-ast",
    "--print-break-location",
    "--print-builtin-code",
    "--print-builtin-size",
    "--print-bytecode",
    "--print-code",
    "--print-code-verbose",
    "--print-deopt-stress",
    "--print-flag-values",
    "--print-maglev-code",
    "--print-maglev-deopt-verbose",
    "--print-maglev-graph",
    "--print-maglev-graphs",
    "--print-opt-code",
    "--print-opt-source",
    "--print-regexp-bytecode",
    "--print-regexp-code",
    "--print-regexp-graph",
    "--print-scopes",
    "--print-turbolev-frontend",
    "--print-turbolev-inline-functions",
    "--print-wasm-code",
    "--print-wasm-stub-code",
    "--trace-deopt",
    "--trace-ic",
    "--trace-ignition",
    "--trace-maps",
    "--trace-maps-details",
    "--trace-opt",
    "--trace-opt-verbose",
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

export const traceExecuteEqualitySchema = z.object({
  input: z.string().min(1),
});

/**
 * Client-facing message for a rejected payload. A ZodError's own `message` is
 * the JSON dump of its issue list, which is useless to a caller and exposes the
 * schema's shape, so report the first issue prefixed with its field instead.
 */
export function validationMessage(err: unknown): string {
  if (err instanceof z.ZodError) {
    const issue = err.issues[0];
    if (!issue) return "invalid payload";
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  }
  return (err instanceof Error && err.message) || "invalid payload";
}

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
