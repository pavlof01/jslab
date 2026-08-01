import { describe, expect, it } from "vitest";
import { normalizeFlags, allowedFlags, runRequestSchema } from "./schemas.js";

describe("normalizeFlags", () => {
  it("drops flags not on the per-engine allowlist", () => {
    const out = normalizeFlags("v8", ["--print-bytecode", "--totally-made-up", "--rm-rf"], 10);
    expect(out).toEqual(["--print-bytecode"]);
  });

  it("dedupes repeated flags", () => {
    const out = normalizeFlags("v8", ["--trace-opt", "--trace-opt", "--trace-opt"], 10);
    expect(out).toEqual(["--trace-opt"]);
  });

  it("returns a sorted, stable order regardless of input order", () => {
    const a = normalizeFlags("v8", ["--trace-opt", "--print-bytecode"], 10);
    const b = normalizeFlags("v8", ["--print-bytecode", "--trace-opt"], 10);
    expect(a).toEqual(b);
    expect(a).toEqual([...a].sort());
  });

  it("caps the number of flags before filtering", () => {
    // maxFlags applies to the raw slice, so anything past the cap is ignored
    // even if it is allowlisted.
    const all = allowedFlags("v8").slice(0, 5);
    const out = normalizeFlags("v8", [...all], 2);
    expect(out.length).toBeLessThanOrEqual(2);
  });

  it("rejects non-string and non-dash-prefixed entries", () => {
    const out = normalizeFlags("v8", ["print-bytecode", "", "   ", "--print-bytecode"], 10);
    expect(out).toEqual(["--print-bytecode"]);
  });

  it("isolates allowlists per engine", () => {
    // A v8 flag must not pass through the hermes allowlist.
    expect(normalizeFlags("hermes", ["--print-bytecode"], 10)).toEqual([]);
    expect(normalizeFlags("hermes", ["-O", "-strict"], 10)).toEqual(["-O", "-strict"]);
  });
});

describe("runRequestSchema", () => {
  it("accepts a minimal valid request", () => {
    const parsed = runRequestSchema.parse({ engine: "v8", sourceText: "1+1" });
    expect(parsed.engine).toBe("v8");
  });

  it("rejects an unknown engine", () => {
    expect(() => runRequestSchema.parse({ engine: "quickjs", sourceText: "1" })).toThrow();
  });

  it("rejects empty sourceText", () => {
    expect(() => runRequestSchema.parse({ engine: "v8", sourceText: "" })).toThrow();
  });
});
