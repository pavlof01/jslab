import { startEngineServer } from "@jslab/engine-runtime";
import { loadConfig } from "./config.js";

const config = loadConfig();

const allowedFlags = new Set(["-O", "-gc-sanitize-handles", "-strict"]);

startEngineServer({
  engine: "hermes",
  allowedFlags,
  tmpPrefix: "engine-hermes-",
  config,
  invoke: ({ scriptPath, flags }) => ({
    cmd: config.HERMES_PATH,
    args: ["-dump-bytecode", ...flags, scriptPath],
  }),
});
