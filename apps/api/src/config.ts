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
  // Traces run engine262, not an engine binary: cheaper per call but issued in
  // bursts as a user steps through the spec visualizer. They get their own
  // bucket so a visualizer session cannot 429 the playground, or vice versa.
  TRACE_RATE_LIMIT_PER_MIN: z.coerce.number().default(30),
  // Public API keys: quota for a valid key, and how many keys one IP may mint per hour.
  API_KEY_RATE_LIMIT_PER_MIN: z.coerce.number().default(240),
  API_KEY_ISSUE_PER_HOUR: z.coerce.number().default(5),
  // The engine-spawning budget for keyed traffic: deliberately NOT the same
  // as API_KEY_RATE_LIMIT_PER_MIN (240) — that number governs cheap gateway
  // requests in general, and letting it also gate process spawns turned a key
  // into a 12x amplifier over the anonymous heavy limit (20/min).
  API_KEY_HEAVY_RATE_LIMIT_PER_MIN: z.coerce.number().default(60),
  // Keys expire instead of living forever, and one owner can hold only this
  // many live keys at once — both bound how much standing quota an anonymous
  // issuer can accumulate.
  API_KEY_TTL_SECONDS: z.coerce.number().default(30 * 24 * 3600),
  API_KEY_MAX_PER_ISSUER: z.coerce.number().default(10),
  MAX_TIMEOUT_MS: z.coerce.number().default(5000),
  // Floor for a caller-supplied timeout. Below this even a trivial snippet
  // cannot finish (spawning the engine binary alone costs tens of ms), so the
  // run would always report a timeout — a 5xx caused purely by the request.
  MIN_TIMEOUT_MS: z.coerce.number().default(250),
  DEFAULT_TIMEOUT_MS: z.coerce.number().default(2000),
  MAX_FLAGS: z.coerce.number().default(10),
  MAX_SOURCE_LENGTH: z.coerce.number().default(20000),
  REQUEST_BODY_LIMIT_BYTES: z.coerce.number().default(512 * 1024),
  LOG_LEVEL: z.string().default("info"),
  // Fastify's `trustProxy` is a hop *count*, not a boolean "trust the whole
  // chain" switch: with a fixed hop count it reads the address that many
  // entries in from the untrusted (client) end of X-Forwarded-For, which is
  // what makes req.ip resistant to a client prepending fake entries. jslab.su
  // has exactly one hop between the pod and the caller (Traefik) once Redis
  // key names are hashed downstream — tune this if you put another proxy in
  // front (or 0 to trust nothing and always use the raw socket address).
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),
  // Preferred over req.ip when present: Cloudflare overwrites this header on
  // every request reaching its edge, so a client cannot forge it (unlike
  // X-Forwarded-For, which Cloudflare appends to rather than replaces). Set
  // to "" if you are not deploying behind Cloudflare.
  CLIENT_IP_HEADER: z.string().default("cf-connecting-ip")
});

export type ApiConfig = z.infer<typeof envSchema>;

export function loadConfig(): ApiConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  return parsed.data;
}
