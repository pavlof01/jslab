import { startEngineServer } from "@jslab/engine-runtime";
import { loadConfig } from "./config.js";

const config = loadConfig();

startEngineServer({
  // Flags come from the shared catalog in @jslab/engine-runtime, keyed by this
  // engine name — the same catalog the api gateway filters against.
  engine: "v8",
  tmpPrefix: "engine-v8-",
  openapiTitle: "engine-v8",
  config,
  invoke: ({ scriptPath, flags }) => ({
    cmd: config.D8_PATH,
    // Heap cap is engine-controlled (not client-supplied): a script that
    // allocates past it gets a JS RangeError rather than OOM-killing the pod.
    args: [`--max-old-space-size=${config.MAX_HEAP_MB}`, ...flags, scriptPath],
  }),
});
