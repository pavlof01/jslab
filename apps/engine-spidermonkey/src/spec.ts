import { matchVersion, type EngineSpec } from "@jslab/engine-runtime";
import type { EngineConfig } from "./config.js";

const BYTECODE_WRAPPER = String.raw`(() => {
  const readFile = typeof read === "function" ? read : null;
  const disFn =
    typeof dis === "function"
      ? dis
      : typeof disassemble === "function"
        ? disassemble
        : typeof disassembleScript === "function"
          ? disassembleScript
          : null;

  if (!readFile) {
    print("ERROR: SpiderMonkey shell 'read()' is not available");
    quit(2);
  }
  if (!disFn) {
    print("ERROR: SpiderMonkey disassembler is not available (expected dis()/disassemble())");
    quit(2);
  }

  const source = readFile("snippet.js");
  let fn;
  try {
    fn = new Function(source);
  } catch (e) {
    print("ERROR: compile failed");
    print(String(e));
    quit(1);
  }

  disFn(fn);
})();`;

export function buildEngineSpec(config: EngineConfig): EngineSpec {
  const binary = config.SM_PATH;
  return {
    engine: "sm",
    tmpPrefix: "engine-sm-",
    config,
    version: {
      cmd: binary,
      candidates: [["--version"]],
      parse: (raw) => matchVersion(raw, /JavaScript-C\s*([^\n]+)/),
    },
    invoke: ({ tmpDir, flags }) => ({
      cmd: binary,
      args: [...flags, "-e", BYTECODE_WRAPPER],
      spawnOptions: { cwd: tmpDir },
    }),
  };
}
