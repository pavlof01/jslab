import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default("0.0.0.0"),
  D8_PATH: z.string().default("/opt/v8/d8"),
  MAX_TIMEOUT_MS: z.coerce.number().default(5000),
  DEFAULT_TIMEOUT_MS: z.coerce.number().default(2000),
  MAX_OUTPUT_BYTES: z.coerce.number().default(2 * 1024 * 1024),
  MAX_FLAGS: z.coerce.number().default(10),
  MAX_SOURCE_LENGTH: z.coerce.number().default(20000),
  // Max concurrent engine processes per pod. Excess /run requests get 503.
  MAX_CONCURRENCY: z.coerce.number().int().positive().default(4),
  // V8 old-space heap cap (MB). Kept under the pod memory limit so a greedy
  // script hits a JS RangeError instead of OOM-killing the whole pod.
  MAX_HEAP_MB: z.coerce.number().int().positive().default(1536),
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
