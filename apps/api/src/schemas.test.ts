import { describe, expect, it } from "vitest";
import { normalizeFlags, allowedFlags, runRequestSchema, validationMessage, clampTimeout } from "./schemas.js";

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

describe("clampTimeout", () => {
  const bounds = { min: 250, max: 5000, fallback: 2000 };

  it("raises a timeout that is too small to ever succeed", () => {
    // A caller asking for 1ms used to reach the engine unchanged and come back
    // as a 504 "execution timed out" — a 5xx caused purely by the request.
    expect(clampTimeout(1, bounds)).toBe(250);
    expect(clampTimeout(249, bounds)).toBe(250);
  });

  it("caps a timeout above the ceiling", () => {
    expect(clampTimeout(60_000, bounds)).toBe(5000);
  });

  it("passes an in-range timeout through", () => {
    expect(clampTimeout(250, bounds)).toBe(250);
    expect(clampTimeout(3000, bounds)).toBe(3000);
    expect(clampTimeout(5000, bounds)).toBe(5000);
  });

  it("falls back to the default when no timeout is given", () => {
    expect(clampTimeout(undefined, bounds)).toBe(2000);
  });
});

describe("validationMessage", () => {
  function messageFor(body: unknown): string {
    try {
      runRequestSchema.parse(body);
      throw new Error("expected the schema to reject this payload");
    } catch (err) {
      return validationMessage(err);
    }
  }

  it("names the offending field instead of dumping the issue list", () => {
    const message = messageFor({ engine: "v8", sourceText: "" });
    expect(message).toMatch(/^sourceText: /);
    // The raw ZodError message is a JSON array of issues; never surface that.
    expect(message).not.toContain("[");
    expect(message).not.toContain("too_small");
  });

  it("names the field for an unknown engine and lists the accepted ones", () => {
    const message = messageFor({ engine: "quickjs", sourceText: "1" });
    expect(message).toMatch(/^engine: /);
    expect(message).toContain("'v8'");
  });

  it("reports a missing field", () => {
    expect(messageFor({ engine: "v8" })).toBe("sourceText: Required");
  });

  it("passes through a plain Error message", () => {
    expect(validationMessage(new Error("sourceText exceeds limit (20000 chars)"))).toBe(
      "sourceText exceeds limit (20000 chars)",
    );
  });

  it("falls back to a generic message for anything else", () => {
    expect(validationMessage(undefined)).toBe("invalid payload");
    expect(validationMessage(new Error(""))).toBe("invalid payload");
  });
});
