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
  // d8 executes the snippet, and the d8 shell unconditionally registers these
  // as globals that can read any file the container user can reach (including
  // the mounted ServiceAccount token). os.system is gated behind a build flag
  // we don't pass, so process exec isn't reachable, but file read is. The
  // shared runtime generates the in-realm lockdown (see lockdown.ts) and hands
  // back its path below.
  blockedGlobals: ["read", "readbuffer", "readline"],
  invoke: ({ scriptPath, flags, preludePaths }) => ({
    cmd: config.D8_PATH,
    // d8 runs multiple script file arguments in order, sharing one global
    // object, so the prelude just needs to precede the snippet.
    // Heap cap is engine-controlled (not client-supplied): a script that
    // allocates past it gets a JS RangeError rather than OOM-killing the pod.
    args: [`--max-old-space-size=${config.MAX_HEAP_MB}`, ...flags, ...preludePaths, scriptPath],
  }),
});
