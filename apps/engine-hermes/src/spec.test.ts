import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";
import { buildEngineSpec } from "./spec.js";

const config = loadConfig();

describe("engine-hermes spec", () => {
  it("names the engine and its temp prefix", () => {
    const spec = buildEngineSpec(config);
    expect(spec.engine).toBe("hermes");
    expect(spec.tmpPrefix).toBe("engine-hermes-");
  });

  it("does not lock down globals — hermes only compiles, never executes", () => {
    expect(buildEngineSpec(config).blockedGlobals).toBeUndefined();
  });

  it("dumps bytecode: flag first, then client flags, then the snippet", () => {
    const inv = buildEngineSpec(config).invoke({
      scriptPath: "/tmp/x/snippet.js",
      tmpDir: "/tmp/x",
      flags: ["-O"],
      preludePaths: [],
    });
    expect(inv.cmd).toBe(config.HERMES_PATH);
    expect(inv.args).toEqual(["-dump-bytecode", "-O", "/tmp/x/snippet.js"]);
  });

  it("composes the release and HBC lines from a real hermes banner", () => {
    const banner = [
      "LLVM (http://llvm.org/):",
      "  Optimized build.",
      "Hermes release version: 0.12.0",
      "HBC bytecode version: 96",
    ].join("\n");
    expect(buildEngineSpec(config).version?.parse(banner)).toBe("0.12.0 (HBC 96)");
  });

  it("falls back to the release line when the HBC line is absent", () => {
    expect(buildEngineSpec(config).version?.parse("Hermes release version: 0.12.0")).toBe("0.12.0");
  });

  it("returns null for output that is not a hermes banner", () => {
    expect(buildEngineSpec(config).version?.parse("some other tool v1")).toBeNull();
  });
});
