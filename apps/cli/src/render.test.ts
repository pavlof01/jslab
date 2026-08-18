import { describe, expect, it } from "vitest";
import type { EngineOutcome } from "./client.js";
import { renderFlags, renderOutcome, renderSummary, toJson, type Theme } from "./render.js";

const plain: Theme = { color: false, width: 60 };

const outcome = (over: Partial<EngineOutcome> = {}): EngineOutcome => ({
  engine: "v8",
  flags: [],
  ok: true,
  stdout: "",
  stderr: "",
  elapsedMs: 100,
  ...over,
});

describe("renderOutcome", () => {
  it("heads each engine with its timing and prints stdout", () => {
    const text = renderOutcome(outcome({ stdout: "LdaSmi [1]\n", durationMs: 12 }), plain);
    expect(text.split("\n")[0]).toContain("V8 (d8) · 12 ms");
    expect(text).toContain("LdaSmi [1]");
  });

  it("marks a cache hit and lists the flags that were sent", () => {
    const text = renderOutcome(outcome({ cacheHit: true, flags: ["--print-bytecode"], stdout: "x" }), plain);
    expect(text).toContain("cached");
    expect(text).toContain("flags: --print-bytecode");
  });

  it("labels stderr separately from stdout", () => {
    const text = renderOutcome(outcome({ stdout: "out", stderr: "warn" }), plain);
    expect(text).toContain("--- stderr ---");
    expect(text.indexOf("out")).toBeLessThan(text.indexOf("warn"));
  });

  it("says so when an engine produced nothing", () => {
    expect(renderOutcome(outcome(), plain)).toContain("(no output)");
  });

  it("shows the failure and the retry hint", () => {
    const text = renderOutcome(
      outcome({ ok: false, failure: { status: 429, message: "rate limit exceeded", retryAfterSeconds: 7 } }),
      plain,
    );
    expect(text).toContain("failed");
    expect(text).toContain("HTTP 429: rate limit exceeded (retry in 7s)");
  });

  it("flags truncated output and server-dropped flags", () => {
    const text = renderOutcome(outcome({ stdout: "x", outputTruncated: true, droppedFlags: ["--nope"] }), plain);
    expect(text).toContain("output truncated");
    expect(text).toContain("dropped by the server: --nope");
  });

  it("emits no escape codes when colour is off", () => {
    expect(renderOutcome(outcome({ stdout: "x" }), plain)).not.toContain("\u001b[");
    expect(renderOutcome(outcome({ stdout: "x" }), { ...plain, color: true })).toContain("\u001b[");
  });
});

describe("renderSummary", () => {
  it("counts the engines that answered and names the ones that did not", () => {
    const text = renderSummary(
      [outcome(), outcome({ engine: "jsc", ok: false, failure: { status: 502, message: "engine unavailable" } })],
      plain,
    );
    expect(text).toContain("2 engines");
    expect(text).toContain("1 ok");
    expect(text).toContain("1 failed: jsc");
  });
});

describe("renderFlags", () => {
  it("groups an engine's catalog by category", () => {
    const text = renderFlags(["v8"], "bytecode", plain);
    expect(text).toContain("[bytecode]");
    expect(text).toContain("--print-bytecode");
    expect(text).toContain("--print-bytecode-filter=VALUE");
    expect(text).not.toContain("--trace-opt");
  });

  it("says when a category is empty for an engine", () => {
    expect(renderFlags(["jsc"], "wasm", plain)).toContain("no flags in category wasm");
  });
});

describe("toJson", () => {
  it("wraps the outcomes with the endpoint and source size", () => {
    const parsed = JSON.parse(toJson("http://gateway.test", "1 + 1", [outcome({ stdout: "2" })]));
    expect(parsed).toMatchObject({ ok: true, api: "http://gateway.test", sourceBytes: 5 });
    expect(parsed.results).toHaveLength(1);
  });

  it("is not ok when any engine failed", () => {
    const parsed = JSON.parse(
      toJson("http://gateway.test", "1", [outcome(), outcome({ engine: "sm", ok: false })]),
    );
    expect(parsed.ok).toBe(false);
  });
});
