import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default("0.0.0.0"),
  MAX_TIMEOUT_MS: z.coerce.number().default(5000),
  DEFAULT_TIMEOUT_MS: z.coerce.number().default(2000),
  MAX_SOURCE_LENGTH: z.coerce.number().default(20000),
  LOG_LEVEL: z.string().default("info")
});

export type TraceServiceConfig = z.infer<typeof envSchema>;

export function loadConfig(): TraceServiceConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  return parsed.data;
}
