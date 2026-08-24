import { describe, expect, it } from "vitest";
import {
  allowedFlags,
  clampTimeout,
  normalizeFlags,
  runRequestSchema,
  traceExecuteEqualitySchema,
  traceExecuteRequestSchema,
  validationMessage,
} from "./schemas.js";

describe("normalizeFlags", () => {
  it("drops flags not on the per-engine allowlist and reports them", () => {
    const out = normalizeFlags("v8", ["--print-bytecode", "--totally-made-up", "--rm-rf"], 10);
    expect(out.flags).toEqual(["--print-bytecode"]);
    expect(out.dropped).toEqual(["--totally-made-up", "--rm-rf"]);
  });

  it("dedupes repeated flags without reporting them as dropped", () => {
    // meta.droppedFlags is documented as flags that never reached the engine.
    // A repeat did reach it (the first occurrence was accepted), so listing it
    // would make a UI flag a working flag as a typo.
    const out = normalizeFlags("v8", ["--trace-opt", "--trace-opt", "--trace-opt"], 10);
    expect(out.flags).toEqual(["--trace-opt"]);
    expect(out.dropped).toEqual([]);
  });

  it("returns a sorted, stable order regardless of input order", () => {
    const a = normalizeFlags("v8", ["--trace-opt", "--print-bytecode"], 10);
    const b = normalizeFlags("v8", ["--print-bytecode", "--trace-opt"], 10);
    expect(a.flags).toEqual(b.flags);
    expect(a.flags).toEqual([...a.flags].sort());
  });

  it("caps the number of flags before filtering", () => {
    // maxFlags applies to the raw list, so anything past the cap is dropped
    // even if it is allowlisted.
    const all = allowedFlags("v8").slice(0, 5);
    const out = normalizeFlags("v8", [...all], 2);
    expect(out.flags).toEqual([...all.slice(0, 2)].sort());
    expect(out.dropped).toContain(all[2]);
  });

  it("rejects non-string and non-dash-prefixed entries", () => {
    // Blank/whitespace entries are rejected but not reported: an empty string
    // in droppedFlags tells the caller nothing they can fix.
    const out = normalizeFlags("v8", ["print-bytecode", "", "   ", "--print-bytecode"], 10);
    expect(out.flags).toEqual(["--print-bytecode"]);
    expect(out.dropped).toEqual(["print-bytecode"]);
  });

  it("does not report a rejected entry whose flag name was accepted elsewhere", () => {
    // The bad value never reached the engine, but --print-bytecode-filter did,
    // so naming it as dropped would send the caller hunting a working flag.
    const out = normalizeFlags(
      "v8",
      ["--print-bytecode-filter=a b", "--print-bytecode-filter=fib"],
      10,
    );
    expect(out.flags).toEqual(["--print-bytecode-filter=fib"]);
    expect(out.dropped).toEqual([]);
  });

  it("isolates allowlists per engine", () => {
    // A v8 flag must not pass through the hermes allowlist.
    expect(normalizeFlags("hermes", ["--print-bytecode"], 10).flags).toEqual([]);
    expect(normalizeFlags("hermes", ["-O", "-strict"], 10).flags).toEqual(["-O", "-strict"]);
  });

  it("bounds the reported drop list so junk input cannot bloat the response", () => {
    const junk = Array.from({ length: 50 }, (_, i) => `--nope-${i}`);
    expect(normalizeFlags("v8", junk, 4).dropped).toHaveLength(4);
  });

  describe("value-bearing flags", () => {
    it("accepts --flag=value when the value matches the catalog pattern", () => {
      const out = normalizeFlags("v8", ["--print-bytecode", "--print-bytecode-filter=fib"], 10);
      expect(out.flags).toEqual(["--print-bytecode", "--print-bytecode-filter=fib"]);
      expect(out.dropped).toEqual([]);
    });

    it("accepts a wildcard filter", () => {
      expect(normalizeFlags("v8", ["--print-bytecode-filter=*fib*"], 10).flags).toEqual([
        "--print-bytecode-filter=*fib*",
      ]);
    });

    it("rejects a value that could smuggle anything past the allowlist", () => {
      const out = normalizeFlags(
        "v8",
        ["--print-bytecode-filter=a b", "--print-bytecode-filter=;rm -rf /"],
        10,
      );
      expect(out.flags).toEqual([]);
      expect(out.dropped).toHaveLength(2);
    });

    it("rejects a value-bearing flag passed without a value", () => {
      const out = normalizeFlags("v8", ["--print-bytecode-filter"], 10);
      expect(out.flags).toEqual([]);
      expect(out.dropped).toEqual(["--print-bytecode-filter"]);
    });

    it("rejects a value on a flag that takes none", () => {
      const out = normalizeFlags("v8", ["--print-bytecode=fib"], 10);
      expect(out.flags).toEqual([]);
      expect(out.dropped).toEqual(["--print-bytecode=fib"]);
    });

    it("dedupes by flag name so a second value cannot override the first", () => {
      const out = normalizeFlags(
        "v8",
        ["--print-bytecode-filter=a", "--print-bytecode-filter=b"],
        10,
      );
      expect(out.flags).toEqual(["--print-bytecode-filter=a"]);
      // The flag itself reached the engine, so it is not reported as dropped.
      expect(out.dropped).toEqual([]);
    });
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

  it("accepts a flags array up to the wire cap", () => {
    const flags = Array.from({ length: 256 }, (_, i) => `-a${i}`);
    expect(() =>
      runRequestSchema.parse({ engine: "v8", sourceText: "1", options: { flags } }),
    ).not.toThrow();
  });

  it("rejects a flags array past the wire cap regardless of MAX_FLAGS", () => {
    // This is a network-layer bound independent of the configurable per-engine
    // MAX_FLAGS the sanitizer applies later — it exists so an oversized array
    // is rejected before the sanitizer ever walks it.
    const flags = Array.from({ length: 257 }, (_, i) => `-a${i}`);
    expect(() =>
      runRequestSchema.parse({ engine: "v8", sourceText: "1", options: { flags } }),
    ).toThrow();
  });
});

describe("traceExecuteRequestSchema / traceExecuteEqualitySchema", () => {
  it("accepts an ordinary trace request", () => {
    expect(() =>
      traceExecuteRequestSchema.parse({ functionName: "ToNumber", input: "42" }),
    ).not.toThrow();
  });

  it("rejects an input string over the length cap", () => {
    expect(() =>
      traceExecuteRequestSchema.parse({ functionName: "ToString", input: "a".repeat(20_001) }),
    ).toThrow();
  });

  it("rejects every non-string input the way trace-service will", () => {
    for (const input of [0, 1, true, false, null, [], ["1"], { x: 1 }]) {
      expect(
        () => traceExecuteRequestSchema.parse({ functionName: "ToNumber", input }),
        `input ${JSON.stringify(input)} must be rejected`,
      ).toThrow();
    }
  });

  it("accepts source text that spells a non-string value", () => {
    for (const input of ["0", "true", "null", "[1, 2]", "{ valueOf: () => 1 }"]) {
      expect(() =>
        traceExecuteRequestSchema.parse({ functionName: "ToNumber", input }),
      ).not.toThrow();
    }
  });

  it("rejects an equality input string over the length cap", () => {
    expect(() => traceExecuteEqualitySchema.parse({ input: "a".repeat(20_001) })).toThrow();
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
