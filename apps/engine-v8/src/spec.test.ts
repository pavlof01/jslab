import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.js";
import { buildEngineSpec } from "./spec.js";

const config = loadConfig();
const invoke = (over = {}) =>
  buildEngineSpec(config).invoke({
    scriptPath: "/tmp/x/snippet.js",
    tmpDir: "/tmp/x",
    flags: [],
    preludePaths: ["/tmp/x/lockdown-shim.js"],
    ...over,
  });

describe("engine-v8 spec", () => {
  it("names the engine and its temp prefix", () => {
    const spec = buildEngineSpec(config);
    expect(spec.engine).toBe("v8");
    expect(spec.tmpPrefix).toBe("engine-v8-");
  });

  it("locks down d8's file-reading globals", () => {
    expect(buildEngineSpec(config).blockedGlobals).toEqual(["read", "readbuffer", "readline"]);
  });

  it("spawns d8 with the heap cap, then flags, then prelude, then the snippet", () => {
    const inv = invoke({ flags: ["--print-bytecode"] });
    expect(inv.cmd).toBe(config.D8_PATH);
    expect(inv.args).toEqual([
      `--max-old-space-size=${config.MAX_HEAP_MB}`,
      "--print-bytecode",
      "/tmp/x/lockdown-shim.js",
      "/tmp/x/snippet.js",
    ]);
  });

  it("keeps the lockdown prelude ahead of the snippet", () => {
    const { args } = invoke();
    expect(args.indexOf("/tmp/x/lockdown-shim.js")).toBeLessThan(args.indexOf("/tmp/x/snippet.js"));
  });

  it("reads the version out of `print(version())` output", () => {
    const spec = buildEngineSpec(config);
    expect(spec.version?.candidates).toEqual([["-e", "print(version())"]]);
    expect(spec.version?.parse("13.1.0 (candidate)")).toBe("13.1.0 (candidate)");
    expect(spec.version?.parse("V8 version\n13.1.0")).toBe("13.1.0");
  });
});
