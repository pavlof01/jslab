import { type EngineSpec, startEngineServer } from "@jslab/engine-runtime";

import type { EngineConfig } from "./config.js";

const BYTECODE_FLAG = "-d" as const;

const CONSOLE_SHIM = `void (globalThis.console ??= { log: print, info: print, warn: print, error: print, debug: print });\n`;

const scrubbedEnv = { ...process.env };
delete (scrubbedEnv as Record<string, string | undefined>).JSC_PATH;

export function buildEngineSpec(config: EngineConfig): EngineSpec {
  return {
    engine: "jsc",
    sortFlags: false,
    tmpPrefix: "engine-jsc-",
    config,
    blockedGlobals: [
      "readFile",
      "writeFile",
      "openFile",
      "load",
      "run",
      "runString",
      "readline",
      "checkSyntax",
      "checkModuleSyntax",
    ],
    prelude: [{ file: "console-shim.js", contents: CONSOLE_SHIM }],
    invoke: ({ scriptPath, flags, preludePaths }) => ({
      cmd: config.JSCSHELL_PATH,
      args: [BYTECODE_FLAG, ...flags, ...preludePaths, scriptPath],
      spawnOptions: { env: scrubbedEnv },
    }),
  };
}
