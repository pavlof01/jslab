import { startEngineServer } from "@jslab/engine-runtime";
import { loadConfig } from "./config.js";

const config = loadConfig();

const allowedFlags = new Set([
  "--allow-natives-syntax",
  "--no-liftoff",
  "--no-wasm-async-compilation",
  "--print-all-code",
  "--print-all-exceptions",
  "--print-ast",
  "--print-break-location",
  "--print-builtin-code",
  "--print-builtin-size",
  "--print-bytecode",
  "--print-code",
  "--print-code-verbose",
  "--print-deopt-stress",
  "--print-flag-values",
  "--print-maglev-code",
  "--print-maglev-deopt-verbose",
  "--print-maglev-graph",
  "--print-maglev-graphs",
  "--print-opt-code",
  "--print-opt-source",
  "--print-regexp-bytecode",
  "--print-regexp-code",
  "--print-regexp-graph",
  "--print-scopes",
  "--print-turbolev-frontend",
  "--print-turbolev-inline-functions",
  "--print-wasm-code",
  "--print-wasm-stub-code",
  "--trace-deopt",
  "--trace-ic",
  "--trace-ignition",
  "--trace-maps",
  "--trace-maps-details",
  "--trace-opt",
  "--trace-opt-verbose",
]);

startEngineServer({
  engine: "v8",
  allowedFlags,
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
