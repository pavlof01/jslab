import { describe, expect, it } from "@jest/globals";

import type { RunResult } from "@/lib/api";
import { aggregateRunResults } from "@/lib/runAggregate";
import { describeRunNotice, formatRunMeta } from "@/lib/runMessages";
import { EngineKey } from "@/lib/types";

const result = (over: Partial<RunResult> = {}): RunResult => ({
  stdout: "",
  stderr: "",
  ms: 0,
  ...over,
});

describe("aggregateRunResults", () => {
  it("reports the slowest engine, not the sum", () => {
    const summary = aggregateRunResults([
      [EngineKey.v8, result({ ms: 40 })],
      [EngineKey.jsc, result({ ms: 120 })],
    ]);

    expect(summary.durationMs).toBe(120);
  });

  it("only calls a run cached when every engine was", () => {
    expect(
      aggregateRunResults([
        [EngineKey.v8, result({ cacheHit: true })],
        [EngineKey.jsc, result({ cacheHit: true })],
      ]).cacheHit,
    ).toBe(true);

    expect(
      aggregateRunResults([
        [EngineKey.v8, result({ cacheHit: true })],
        [EngineKey.jsc, result({ cacheHit: false })],
      ]).cacheHit,
    ).toBe(false);
  });

  it("is not cached when nothing ran at all", () => {
    expect(aggregateRunResults([]).cacheHit).toBe(false);
  });

  it("prefers a rate limit over another engine's generic failure", () => {
    const summary = aggregateRunResults([
      [EngineKey.v8, result({ failure: { status: 502, message: "bad gateway" } })],
      [EngineKey.jsc, result({ failure: { status: 429, message: "slow down" } })],
    ]);

    expect(summary.failure?.status).toBe(429);
    expect(summary.allFailed).toBe(true);
  });

  it("does not call a run failed when one engine answered", () => {
    const summary = aggregateRunResults([
      [EngineKey.v8, result({ stdout: "ok" })],
      [EngineKey.jsc, result({ failure: { status: 502, message: "bad gateway" } })],
    ]);

    expect(summary.allFailed).toBe(false);
    expect(summary.failure?.status).toBe(502);
  });

  it("unions dropped flags across engines without repeating one", () => {
    const summary = aggregateRunResults([
      [EngineKey.v8, result({ droppedFlags: ["--nope", "--also-nope"] })],
      [EngineKey.jsc, result({ droppedFlags: ["--nope"] })],
    ]);

    expect(summary.droppedFlags).toEqual(["--nope", "--also-nope"]);
  });

  it("fills every engine so the output pane can index into it", () => {
    const summary = aggregateRunResults([[EngineKey.v8, result({ stdout: "out" })]]);

    expect(summary.out[EngineKey.hermes]).toEqual({ stdout: "", stderr: "" });
  });
});

describe("describeRunNotice", () => {
  it("says nothing when there is nothing to say", () => {
    expect(describeRunNotice(false, [])).toBeUndefined();
  });

  it("pluralises the ignored flags", () => {
    expect(describeRunNotice(false, ["--x"])).toBe("Flag ignored by this engine: --x.");
    expect(describeRunNotice(false, ["--x", "--y"])).toBe(
      "Flags ignored by this engine: --x, --y.",
    );
  });

  it("reports truncation and ignored flags together", () => {
    const notice = describeRunNotice(true, ["--x"]);
    expect(notice).toContain("truncated");
    expect(notice).toContain("--x");
  });
});

describe("formatRunMeta", () => {
  it("is empty when no engine reported a duration", () => {
    expect(formatRunMeta(0, false)).toBe("");
  });

  it("marks a fully cached run", () => {
    expect(formatRunMeta(7, true)).toBe("Duration: 7 ms · cached");
    expect(formatRunMeta(7, false)).toBe("Duration: 7 ms");
  });
});
