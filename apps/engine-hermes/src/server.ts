import { matchVersion, startEngineServer } from "@jslab/engine-runtime";
import { loadConfig } from "./config.js";

const config = loadConfig();
const binary = config.HERMES_PATH;

startEngineServer({
  engine: "hermes",
  tmpPrefix: "engine-hermes-",
  config,
  version: {
    cmd: binary,
    candidates: [["--version"]],
    parse: (raw) => {
      const release = matchVersion(raw, /Hermes release version:\s*([^\n]+)/);
      if (!release) return null;
      const bytecode = matchVersion(raw, /HBC bytecode version:\s*([^\n]+)/);
      return bytecode ? `${release} (HBC ${bytecode})` : release;
    },
  },
  invoke: ({ scriptPath, flags }) => ({
    cmd: binary,
    args: ["-dump-bytecode", ...flags, scriptPath],
  }),
});
