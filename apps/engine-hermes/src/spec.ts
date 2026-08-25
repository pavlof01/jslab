import { type EngineSpec, matchVersion } from "@jslab/engine-runtime";

import type { EngineConfig } from "./config.js";

export function buildEngineSpec(config: EngineConfig): EngineSpec {
  const binary = config.HERMES_PATH;
  return {
    engine: "hermes",
    tmpPrefix: "engine-hermes-",
    config,
    version: {
      cmd: binary,
      candidates: [["--version"]],
      parse: (raw) => {
        const release = matchVersion(raw, /Hermes release version:([^\n]*)/);
        if (!release) return null;
        const bytecode = matchVersion(raw, /HBC bytecode version:([^\n]*)/);
        return bytecode ? `${release} (HBC ${bytecode})` : release;
      },
    },
    invoke: ({ scriptPath, flags }) => ({
      cmd: binary,
      args: ["-dump-bytecode", ...flags, scriptPath],
    }),
  };
}
