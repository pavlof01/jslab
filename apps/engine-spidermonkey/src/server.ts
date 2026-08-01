import { startEngineServer } from "@jslab/engine-runtime";
import { loadConfig } from "./config.js";

const config = loadConfig();

const allowedFlags = new Set(["--baseline-eager", "--ion-eager"]);

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

startEngineServer({
  engine: "sm",
  allowedFlags,
  tmpPrefix: "engine-sm-",
  config,
  // The wrapper reads "snippet.js" relative to cwd, so run from the temp dir.
  invoke: ({ tmpDir, flags }) => ({
    cmd: config.SM_PATH,
    args: [...flags, "-e", BYTECODE_WRAPPER],
    spawnOptions: { cwd: tmpDir },
  }),
});
