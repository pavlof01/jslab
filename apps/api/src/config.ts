import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default("0.0.0.0"),
  REDIS_URL: z.string().default("redis://redis:6379"),
  ENGINE_V8_URL: z.string().default("http://engine-v8:8080"),
  ENGINE_HERMES_URL: z.string().default("http://engine-hermes:8080"),
  ENGINE_SM_URL: z.string().default("http://engine-spidermonkey:8080"),
  ENGINE_JSC_URL: z.string().default("http://engine-jsc:8080"),
  CACHE_TTL_SECONDS: z.coerce.number().default(600),
  RATE_LIMIT_PER_MIN: z.coerce.number().default(60),
  RATE_LIMIT_HEAVY_PER_MIN: z.coerce.number().default(20),
  MAX_TIMEOUT_MS: z.coerce.number().default(5000),
  DEFAULT_TIMEOUT_MS: z.coerce.number().default(2000),
  MAX_FLAGS: z.coerce.number().default(10),
  MAX_SOURCE_LENGTH: z.coerce.number().default(20000),
  REQUEST_BODY_LIMIT_BYTES: z.coerce.number().default(512 * 1024),
  API_KEY: z.string().optional(),
  PUBLIC_RUN_ENDPOINT: z.coerce.boolean().default(true),
  ENGINE_SHARED_SECRET: z.string().optional(),
  LOG_LEVEL: z.string().default("info")
});

export type ApiConfig = z.infer<typeof envSchema>;

export function loadConfig(): ApiConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  return parsed.data;
}
