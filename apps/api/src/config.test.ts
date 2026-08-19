import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

/**
 * The gateway's whole operational envelope (timeouts, quotas, proxy trust) is
 * environment-driven, so the parse itself is worth pinning: a silently-defaulted
 * or silently-coerced value is a production behaviour change with no diff.
 */

// Every name the schema knows: a test for defaults has to start from an
// environment that has none of them, and a deploy shell (or a sourced
// configmap) has most.
const KEYS = [
  "PORT",
  "HOST",
  "REDIS_URL",
  "ENGINE_V8_URL",
  "ENGINE_HERMES_URL",
  "ENGINE_SM_URL",
  "ENGINE_JSC_URL",
  "TRACE_SERVICE_URL",
  "CACHE_TTL_SECONDS",
  "NEGATIVE_CACHE_TTL_SECONDS",
  "RATE_LIMIT_PER_MIN",
  "RATE_LIMIT_HEAVY_PER_MIN",
  "TRACE_RATE_LIMIT_PER_MIN",
  "API_KEY_RATE_LIMIT_PER_MIN",
  "API_KEY_ISSUE_PER_HOUR",
  "API_KEY_HEAVY_RATE_LIMIT_PER_MIN",
  "API_KEY_TTL_SECONDS",
  "API_KEY_MAX_PER_ISSUER",
  "REDIS_COMMAND_TIMEOUT_MS",
  "MAX_TIMEOUT_MS",
  "MIN_TIMEOUT_MS",
  "DEFAULT_TIMEOUT_MS",
  "MAX_FLAGS",
  "MAX_SOURCE_LENGTH",
  "REQUEST_BODY_LIMIT_BYTES",
  "LOG_LEVEL",
  "TRUST_PROXY_HOPS",
  "CLIENT_IP_HEADER",
];

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  for (const key of KEYS) delete process.env[key];
});

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("loadConfig", () => {
  it("supplies the documented defaults for an empty environment", () => {
    const config = loadConfig();
    expect(config.PORT).toBe(8080);
    expect(config.HOST).toBe("0.0.0.0");
    expect(config.REDIS_URL).toBe("redis://redis:6379");
    expect(config.ENGINE_V8_URL).toBe("http://engine-v8:8080");
    expect(config.RATE_LIMIT_PER_MIN).toBe(60);
    expect(config.RATE_LIMIT_HEAVY_PER_MIN).toBe(20);
    expect(config.TRACE_RATE_LIMIT_PER_MIN).toBe(30);
    expect(config.CLIENT_IP_HEADER).toBe("cf-connecting-ip");
    expect(config.TRUST_PROXY_HOPS).toBe(1);
  });

  it("keeps the keyed heavy budget below the keyed general budget", () => {
    const config = loadConfig();
    // A key must not become an amplifier over the anonymous engine-spawn budget.
    expect(config.API_KEY_HEAVY_RATE_LIMIT_PER_MIN).toBeLessThan(config.API_KEY_RATE_LIMIT_PER_MIN);
  });

  it("coerces numeric strings from the environment", () => {
    process.env.PORT = "9999";
    process.env.MAX_TIMEOUT_MS = "12000";
    process.env.API_KEY_TTL_SECONDS = "3600";
    const config = loadConfig();
    expect(config.PORT).toBe(9999);
    expect(config.MAX_TIMEOUT_MS).toBe(12000);
    expect(config.API_KEY_TTL_SECONDS).toBe(3600);
  });

  it("allows CLIENT_IP_HEADER to be turned off with an empty string", () => {
    process.env.CLIENT_IP_HEADER = "";
    expect(loadConfig().CLIENT_IP_HEADER).toBe("");
  });

  it("allows TRUST_PROXY_HOPS to be zero", () => {
    process.env.TRUST_PROXY_HOPS = "0";
    expect(loadConfig().TRUST_PROXY_HOPS).toBe(0);
  });

  it("rejects a negative hop count", () => {
    process.env.TRUST_PROXY_HOPS = "-1";
    expect(() => loadConfig()).toThrow(/Invalid environment/);
  });

  it("rejects a non-integer hop count", () => {
    process.env.TRUST_PROXY_HOPS = "1.5";
    expect(() => loadConfig()).toThrow(/Invalid environment/);
  });

  it("rejects a non-numeric value where a number is required", () => {
    process.env.PORT = "not-a-port";
    expect(() => loadConfig()).toThrow(/Invalid environment/);
  });
});
