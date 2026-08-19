import path from "node:path";
import { startEngineServer } from "@jslab/engine-runtime";
import { loadConfig } from "./config.js";

const config = loadConfig();

// d8 executes the snippet, and the d8 shell unconditionally registers
// read()/readbuffer()/readline() as globals that can read any file the
// container user can reach (including the mounted ServiceAccount token).
// os.system is gated behind a build flag we don't pass, so process exec isn't
// reachable, but file read is — same class of problem as jsc (see its server
// for the fuller writeup), so it gets the same in-realm lockdown.
const BLOCKED_GLOBALS = ["read", "readbuffer", "readline"] as const;
const LOCKDOWN_SHIM = `
(function () {
  function deny(name) {
    return function () { throw new Error("'" + name + "' is disabled in this sandbox"); };
  }
  [${BLOCKED_GLOBALS.map((name) => JSON.stringify(name)).join(", ")}].forEach(function (name) {
    try { globalThis[name] = deny(name); } catch (e) {}
    try { delete globalThis[name]; } catch (e) {}
  });
})();
`;
const LOCKDOWN_SHIM_FILE = "lockdown-shim.js";

startEngineServer({
  // Flags come from the shared catalog in @jslab/engine-runtime, keyed by this
  // engine name — the same catalog the api gateway filters against.
  engine: "v8",
  tmpPrefix: "engine-v8-",
  openapiTitle: "engine-v8",
  config,
  invoke: ({ scriptPath, tmpDir, flags }) => {
    // d8 runs multiple script file arguments in order, sharing one global
    // object, so the lockdown file just needs to precede the snippet.
    const lockdownPath = path.join(tmpDir, LOCKDOWN_SHIM_FILE);
    return {
      cmd: config.D8_PATH,
      // Heap cap is engine-controlled (not client-supplied): a script that
      // allocates past it gets a JS RangeError rather than OOM-killing the pod.
      args: [`--max-old-space-size=${config.MAX_HEAP_MB}`, ...flags, lockdownPath, scriptPath],
      extraFiles: [{ path: lockdownPath, contents: LOCKDOWN_SHIM }],
    };
  },
});
