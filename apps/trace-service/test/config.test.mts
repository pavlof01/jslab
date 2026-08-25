import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "../config.ts";

/**
 * MAX_TIMEOUT_MS becomes the sandbox's kill budget and MAX_SOURCE_LENGTH the
 * request schema's bound, so a silently-defaulted value here changes what the
 * service will execute.
 */

const KEYS = ["PORT", "HOST", "MAX_TIMEOUT_MS", "MAX_SOURCE_LENGTH", "LOG_LEVEL"] as const;

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
    expect(loadConfig()).toEqual({
      PORT: 8080,
      HOST: "0.0.0.0",
      MAX_TIMEOUT_MS: 5000,
      MAX_SOURCE_LENGTH: 20000,
      LOG_LEVEL: "info",
    });
  });

  it("coerces numeric strings from the environment", () => {
    process.env.PORT = "9090";
    process.env.MAX_TIMEOUT_MS = "1500";
    process.env.MAX_SOURCE_LENGTH = "500";

    expect(loadConfig()).toMatchObject({
      PORT: 9090,
      MAX_TIMEOUT_MS: 1500,
      MAX_SOURCE_LENGTH: 500,
    });
  });

  it("rejects a non-numeric value where a number is required", () => {
    process.env.MAX_TIMEOUT_MS = "soon";
    expect(() => loadConfig()).toThrow(/Invalid environment/);
  });
});
