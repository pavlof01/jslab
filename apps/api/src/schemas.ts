import { z } from "zod";
import { flagCatalog, sanitizeFlags, type FlagSpec, type SanitizedFlags } from "./flags.js";
import type { EngineKind, RunRequest, TraceExecuteInput, TraceExecuteRequest } from "./types.js";

/** Full catalog entries for an engine, for the /api/flags documentation route. */
export function flagSpecs(engine: EngineKind): readonly FlagSpec[] {
  return flagCatalog[engine];
}

/**
 * Flag names accepted for an engine. Value-bearing entries are listed by name
 * only; they are accepted on the wire as `--name=value`.
 */
export function allowedFlags(engine: EngineKind): readonly string[] {
  return flagCatalog[engine].map((spec) => spec.flag);
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
 * Clamp a caller-supplied timeout into the range the engines can actually
 * honour. The upper bound protects the pod; the lower bound protects the
 * caller from asking for a run that can only ever time out.
 */
export function clampTimeout(
  requested: number | undefined,
  bounds: { min: number; max: number; fallback: number },
): number {
  const wanted = requested ?? bounds.fallback;
  return Math.min(Math.max(wanted, bounds.min), bounds.max);
}

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

/**
 * Gateway-side flag filtering. Runs the same sanitizer the engines run, over
 * the same catalog, so a flag can never be accepted here and dropped there.
 * Rejected flags come back in `dropped` and are reported to the caller.
 */
export function normalizeFlags(engine: EngineKind, flags: string[], maxFlags: number): SanitizedFlags {
  return sanitizeFlags(engine, flags, { maxFlags });
}
