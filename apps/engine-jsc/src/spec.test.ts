import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.js";
import { buildEngineSpec } from "./spec.js";

const config = loadConfig();
const invoke = (over = {}) =>
  buildEngineSpec(config).invoke({
    scriptPath: "/tmp/x/snippet.js",
    tmpDir: "/tmp/x",
    flags: [],
    preludePaths: ["/tmp/x/lockdown-shim.js", "/tmp/x/console-shim.js"],
    ...over,
  });

describe("engine-jsc spec", () => {
  it("names the engine and does not sort flags", () => {
    const spec = buildEngineSpec(config);
    expect(spec.engine).toBe("jsc");
    expect(spec.sortFlags).toBe(false);
  });

  it("locks down jsc's file and code-loading globals", () => {
    expect(buildEngineSpec(config).blockedGlobals).toEqual([
      "readFile",
      "writeFile",
      "openFile",
      "load",
      "run",
      "runString",
      "readline",
      "checkSyntax",
      "checkModuleSyntax",
    ]);
  });

  it("ships a console shim as a prelude, since the jsc shell has no console", () => {
    const prelude = buildEngineSpec(config).prelude;
    expect(prelude).toHaveLength(1);
    expect(prelude?.[0].file).toBe("console-shim.js");
    expect(prelude?.[0].contents).toContain("globalThis.console");
  });

  it("spawns jsc with -d, then flags, then prelude (lockdown before shim), then snippet", () => {
    const inv = invoke({ flags: ["--dumpDataFormat=1"] });
    expect(inv.args).toEqual([
      "-d",
      "--dumpDataFormat=1",
      "/tmp/x/lockdown-shim.js",
      "/tmp/x/console-shim.js",
      "/tmp/x/snippet.js",
    ]);
  });

  it("scrubs JSC_PATH from the child env so jsc does not read it as a VM option", () => {
    const inv = invoke();
    expect(inv.spawnOptions?.env).toBeDefined();
    expect(inv.spawnOptions?.env).not.toHaveProperty("JSC_PATH");
  });
});

describe("engine-jsc config", () => {
  it("prefers JSCSHELL_PATH, falls back to JSC_PATH, then to 'jsc'", () => {
    const saved = { ...process.env };
    const load = () => loadConfig();
    try {
      delete process.env.JSCSHELL_PATH;
      delete process.env.JSC_PATH;
      expect(load().JSCSHELL_PATH).toBe("jsc");

      process.env.JSC_PATH = "/legacy/jsc";
      expect(load().JSCSHELL_PATH).toBe("/legacy/jsc");

      process.env.JSCSHELL_PATH = "/new/jsc";
      expect(load().JSCSHELL_PATH).toBe("/new/jsc");
    } finally {
      process.env = saved;
    }
  });
});
