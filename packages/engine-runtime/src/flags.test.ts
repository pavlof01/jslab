import { describe, expect, it } from "vitest";

import { type CatalogEngine, flagCatalog, sanitizeFlags } from "./flags.js";

describe("flag catalog contents", () => {
  const engines: CatalogEngine[] = ["v8", "hermes", "sm", "jsc"];

  it("covers every engine the gateway can route to", () => {
    for (const engine of engines) expect(flagCatalog[engine].length).toBeGreaterThan(0);
  });

  it("has no duplicate flag names within an engine", () => {
    for (const engine of engines) {
      const names = flagCatalog[engine].map((spec) => spec.flag);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it("gives every value-bearing flag a value pattern", () => {
    // Without a pattern a value-bearing flag would accept arbitrary argv text.
    for (const engine of engines) {
      for (const spec of flagCatalog[engine]) {
        if (spec.takesValue) expect(spec.valuePattern).toBeInstanceOf(RegExp);
        else expect(spec.valuePattern).toBeUndefined();
      }
    }
  });

  it("accepts every catalogued non-value flag through the sanitizer", () => {
    for (const engine of engines) {
      const names = flagCatalog[engine].filter((spec) => !spec.takesValue).map((spec) => spec.flag);
      const out = sanitizeFlags(engine, names, { maxFlags: names.length });
      expect(out.dropped).toEqual([]);
      expect(out.flags).toHaveLength(names.length);
    }
  });

  it("drops everything for an engine that is not in the catalog", () => {
    expect(sanitizeFlags("quickjs", ["-d"], { maxFlags: 4 })).toEqual({
      flags: [],
      dropped: ["-d"],
    });
  });

  it("keeps the caller's order when sorting is disabled", () => {
    // jsc runs with sortFlags: false; the sanitizer must not reorder there.
    const out = sanitizeFlags("v8", ["--trace-opt", "--print-bytecode"], {
      maxFlags: 4,
      sort: false,
    });
    expect(out.flags).toEqual(["--trace-opt", "--print-bytecode"]);
  });
});
