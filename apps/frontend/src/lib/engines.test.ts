import { describe, expect, it } from "@jest/globals";

import { EngineKey } from "@/lib/types";

import { engineLabel, engineLang, ENGINES } from "./engines";

const allEngines = Object.values(EngineKey) as EngineKey[];

describe("engine descriptors", () => {
  it("describes every engine the app can select", () => {
    for (const engine of allEngines) expect(ENGINES[engine]).toBeDefined();
  });

  it("gives every engine a distinct bytecode language for the highlighter", () => {
    const langs = allEngines.map((engine) => ENGINES[engine].lang);
    expect(new Set(langs).size).toBe(langs.length);
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
