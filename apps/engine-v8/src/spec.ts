import type { EngineSpec } from "@jslab/engine-runtime";

import type { EngineConfig } from "./config.js";

export function buildEngineSpec(config: EngineConfig): EngineSpec {
  const binary = config.D8_PATH;
  return {
    engine: "v8",
    tmpPrefix: "engine-v8-",
    openapiTitle: "engine-v8",
    config,
    blockedGlobals: ["read", "readbuffer", "readline"],
    version: {
      cmd: binary,
      candidates: [["-e", "print(version())"]],
      // Line by line rather than one regex over the whole probe output: a
      // `[^\n]*` tail after `\d+` lets the two compete for the same digits,
      // which backtracks quadratically on a long run of them
      // (CodeQL js/polynomial-redos). Split first and the input is one short line.
      parse: (raw) =>
        raw
          .split("\n")
          .map((line) => line.trim())
          .find((line) => /^\d+\.\d/.test(line)) ?? null,
    },
    invoke: ({ scriptPath, flags, preludePaths }) => ({
      cmd: binary,
      args: [`--max-old-space-size=${config.MAX_HEAP_MB}`, ...flags, ...preludePaths, scriptPath],
    }),
  };
}
