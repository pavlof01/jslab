import { startEngineServer } from "@jslab/engine-runtime";
import { loadConfig } from "./config.js";

const config = loadConfig();

startEngineServer({
  engine: "hermes",
  tmpPrefix: "engine-hermes-",
  config,
  invoke: ({ scriptPath, flags }) => ({
    cmd: config.HERMES_PATH,
    args: ["-dump-bytecode", ...flags, scriptPath],
  }),
});
