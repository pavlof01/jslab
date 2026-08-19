import { z } from "zod";

/**
 * Environment shared by every engine service.
 *
 * These defaults are a contract, not a per-service preference: the gateway
 * clamps timeouts against MAX_TIMEOUT_MS, sizes its cache guard against
 * MAX_OUTPUT_BYTES, and caps flags at MAX_FLAGS. Four hand-maintained copies of
 * the same block drift silently, so each service extends this schema with the
 * one or two fields that are genuinely its own (the binary path, v8's heap cap)
 * instead of restating all of it.
 */
export const engineEnvBase = z.object({
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default("0.0.0.0"),
  MAX_TIMEOUT_MS: z.coerce.number().default(5000),
  DEFAULT_TIMEOUT_MS: z.coerce.number().default(2000),
  MAX_OUTPUT_BYTES: z.coerce.number().default(2 * 1024 * 1024),
  MAX_FLAGS: z.coerce.number().default(10),
  MAX_SOURCE_LENGTH: z.coerce.number().default(20000),
  // Max concurrent engine processes per pod. Excess /run requests get 429 (with Retry-After).
  MAX_CONCURRENCY: z.coerce.number().int().positive().default(4),
  LOG_LEVEL: z.string().default("info"),
});

/** Config fields the shared runtime needs; each engine's config is a superset. */
export type EngineRuntimeConfig = z.infer<typeof engineEnvBase>;

/**
 * Parse an environment against `schema` or fail loudly, naming the service that
 * could not start. Every service boots this way, so a bad env var reads the
 * same everywhere instead of six near-identical wrappers each phrasing it
 * slightly differently.
 */
export function loadEnv<T extends z.ZodTypeAny>(
  schema: T,
  service: string,
  env: Record<string, string | undefined> = process.env,
): z.infer<T> {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment for ${service}: ${parsed.error.message}`);
  }
  return parsed.data as z.infer<T>;
}
