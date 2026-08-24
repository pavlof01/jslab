import { type EngineSpec, matchVersion } from "@jslab/engine-runtime";
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
      parse: (raw) => matchVersion(raw, /^\s*(\d+\.\d+[^\n]*)$/m),
    },
    invoke: ({ scriptPath, flags, preludePaths }) => ({
      cmd: binary,
      args: [`--max-old-space-size=${config.MAX_HEAP_MB}`, ...flags, ...preludePaths, scriptPath],
    }),
  };
}
