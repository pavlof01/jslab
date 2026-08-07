import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default("0.0.0.0"),
  SM_PATH: z.string().default("js"),
  MAX_TIMEOUT_MS: z.coerce.number().default(5000),
  DEFAULT_TIMEOUT_MS: z.coerce.number().default(2000),
  MAX_OUTPUT_BYTES: z.coerce.number().default(2 * 1024 * 1024),
  MAX_FLAGS: z.coerce.number().default(10),
  MAX_SOURCE_LENGTH: z.coerce.number().default(20000),
  // Max concurrent engine processes per pod. Excess /run requests get 429 (with Retry-After).
  MAX_CONCURRENCY: z.coerce.number().int().positive().default(4),
  LOG_LEVEL: z.string().default("info")
});

export type EngineConfig = z.infer<typeof envSchema>;

export function loadConfig(): EngineConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  return parsed.data;
}
