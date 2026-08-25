import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.js";
import { buildEngineSpec } from "./spec.js";

const config = loadConfig();

describe("engine-sm spec", () => {
  it("names the engine and its temp prefix", () => {
    const spec = buildEngineSpec(config);
    expect(spec.engine).toBe("sm");
    expect(spec.tmpPrefix).toBe("engine-sm-");
  });

  it("does not lock down globals — sm only compiles + disassembles", () => {
    expect(buildEngineSpec(config).blockedGlobals).toBeUndefined();
  });

  it("runs from the temp dir so the wrapper can read snippet.js by cwd", () => {
    const inv = buildEngineSpec(config).invoke({
      scriptPath: "/tmp/x/snippet.js",
      tmpDir: "/tmp/x",
      flags: ["--ion-eager"],
      preludePaths: [],
    });
    expect(inv.cmd).toBe(config.SM_PATH);
    expect(inv.spawnOptions?.cwd).toBe("/tmp/x");
    expect(inv.args[0]).toBe("--ion-eager");
    expect(inv.args).toContain("-e");
    const program = inv.args[inv.args.indexOf("-e") + 1];
    expect(program).toContain('readFile("snippet.js")');
    expect(program).toMatch(/dis|disassemble/);
  });

  it("reads the bare JavaScript-C version banner", () => {
    expect(buildEngineSpec(config).version?.parse("JavaScript-C134.0")).toBe("134.0");
    expect(buildEngineSpec(config).version?.parse("nonsense")).toBeNull();
  });
});
