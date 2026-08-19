import { describe, expect, it } from "@jest/globals";

import { EngineKey } from "@/lib/types";
import { ENGINES, engineLabel, engineLang } from "./engines";

const allEngines = Object.values(EngineKey) as EngineKey[];

describe("engine descriptors", () => {
  it("describes every engine the app can select", () => {
    for (const engine of allEngines) expect(ENGINES[engine]).toBeDefined();
  });

  it("gives every engine a distinct bytecode language for the highlighter", () => {
    const langs = allEngines.map((engine) => ENGINES[engine].lang);
    expect(new Set(langs).size).toBe(langs.length);
  });

  it("records at least one quirk per engine, since the UI surfaces them", () => {
    for (const engine of allEngines) {
      expect(ENGINES[engine].quirks.length).toBeGreaterThan(0);
      expect(ENGINES[engine].summary.length).toBeGreaterThan(0);
    }
  });

  it("marks exactly the engines that actually execute the snippet", () => {
    // Hermes and SpiderMonkey compile-and-disassemble only; V8 and JSC run it.
    expect(ENGINES[EngineKey.v8].executes).toBe(true);
    expect(ENGINES[EngineKey.jsc].executes).toBe(true);
    expect(ENGINES[EngineKey.hermes].executes).toBe(false);
    expect(ENGINES[EngineKey.sm].executes).toBe(false);
  });

  it("warns that a non-executing engine produces no program output", () => {
    for (const engine of allEngines) {
      if (ENGINES[engine].executes) continue;
      expect(ENGINES[engine].summary.toLowerCase()).toContain("not executed");
    }
  });
});

describe("engineLabel / engineLang", () => {
  it("returns the short label for a tab header", () => {
    expect(engineLabel(EngineKey.v8)).toBe("V8");
    expect(engineLabel(EngineKey.sm)).toBe("SpiderMonkey");
  });

  it("returns the highlighter language id", () => {
    expect(engineLang(EngineKey.hermes)).toBe("hermesbc");
    expect(engineLang(EngineKey.jsc)).toBe("jscbc");
  });
});
