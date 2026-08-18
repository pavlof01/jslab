import { describe, it, expect } from "@jest/globals";

import { describeRunFailure } from "./runMessages";

describe("describeRunFailure", () => {
  it("spells out the wait for a rate limit", () => {
    expect(describeRunFailure({ status: 429, message: "rate limit exceeded", retryAfterSeconds: 12 })).toContain(
      "12 seconds",
    );
    expect(describeRunFailure({ status: 429, message: "rate limit exceeded", retryAfterSeconds: 1 })).toContain(
      "1 second.",
    );
  });

  it("stays readable when no retry delay was advertised", () => {
    const text = describeRunFailure({ status: 429, message: "rate limit exceeded" });
    expect(text).toContain("Try again in a moment");
    expect(text).not.toContain("undefined");
  });

  it("labels a network failure without an HTTP status", () => {
    expect(describeRunFailure({ status: 0, message: "Failed to fetch" })).toBe(
      "Could not reach the engine service: Failed to fetch",
    );
  });

  it("includes the status for other failures", () => {
    expect(describeRunFailure({ status: 502, message: "engine unavailable" })).toBe(
      "Run failed (HTTP 502): engine unavailable",
    );
  });

});
