import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default("0.0.0.0"),
  REDIS_URL: z.string().default("redis://redis:6379"),
  ENGINE_V8_URL: z.string().default("http://engine-v8:8080"),
  ENGINE_HERMES_URL: z.string().default("http://engine-hermes:8080"),
  ENGINE_SM_URL: z.string().default("http://engine-spidermonkey:8080"),
  ENGINE_JSC_URL: z.string().default("http://engine-jsc:8080"),
  TRACE_SERVICE_URL: z.string().default("http://trace-service:8080"),
  CACHE_TTL_SECONDS: z.coerce.number().default(600),
  // Short TTL for deterministic failures (bad input, engine-reported timeout)
  // so a snippet that reliably fails doesn't re-burn an engine slot every hit.
  NEGATIVE_CACHE_TTL_SECONDS: z.coerce.number().default(30),
  RATE_LIMIT_PER_MIN: z.coerce.number().default(60),
  RATE_LIMIT_HEAVY_PER_MIN: z.coerce.number().default(20),
  // Public API keys: quota for a valid key, and how many keys one IP may mint per hour.
  API_KEY_RATE_LIMIT_PER_MIN: z.coerce.number().default(240),
  API_KEY_ISSUE_PER_HOUR: z.coerce.number().default(5),
  MAX_TIMEOUT_MS: z.coerce.number().default(5000),
  // Floor for a caller-supplied timeout. Below this even a trivial snippet
  // cannot finish (spawning the engine binary alone costs tens of ms), so the
  // run would always report a timeout — a 5xx caused purely by the request.
  MIN_TIMEOUT_MS: z.coerce.number().default(250),
  DEFAULT_TIMEOUT_MS: z.coerce.number().default(2000),
  MAX_FLAGS: z.coerce.number().default(10),
  MAX_SOURCE_LENGTH: z.coerce.number().default(20000),
  REQUEST_BODY_LIMIT_BYTES: z.coerce.number().default(512 * 1024),
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
