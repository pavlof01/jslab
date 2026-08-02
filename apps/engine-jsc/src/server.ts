import { startEngineServer } from "@jslab/engine-runtime";
import path from "path";
import { loadConfig } from "./config.js";

const config = loadConfig();

const BYTECODE_FLAG = "-d" as const;

// The jsc shell has no `console`, so the first line every newcomer writes
// (`console.log(...)`) dies with "TypeError: undefined is not an object". The
// shell's own `print` already stringifies and space-joins its arguments, so
// aliasing the console methods onto it is enough. Kept to a single global
// assignment on purpose: jsc's -d dumps bytecode for every script it loads, and
// this one has to stay a footnote above the snippet's own dump. `??=` leaves a
// host-provided console (future jsc builds) alone.
// `void` on purpose: jsc prints each script's completion value as "End: <value>",
// so a bare assignment would put "End: [object Object]" above the snippet's own
// output on every single run.
const CONSOLE_SHIM = `void (globalThis.console ??= { log: print, info: print, warn: print, error: print, debug: print });\n`;
const CONSOLE_SHIM_FILE = "console-shim.js";

// JSC parses env vars starting with "JSC_" as VM options (Options.cpp).
// `JSC_PATH` is meant for this wrapper, not the engine, and causes noisy stderr.
const scrubbedEnv = { ...process.env };
delete (scrubbedEnv as Record<string, string | undefined>).JSC_PATH;

startEngineServer({
  engine: "jsc",
  // Keep stable order; don't sort (order may matter if more flags are added).
  sortFlags: false,
  tmpPrefix: "engine-jsc-",
  config,
  // NOTE: jsc EXECUTES the script (the -d flag dumps bytecode but the file
  // still runs), unlike sm/hermes which only compile + disassemble. jsc has no
  // portable per-process heap cap (cf. d8's --max-old-space-size), so a single
  // greedy script is bounded only by the concurrency gate + the pod memory limit.
  invoke: ({ scriptPath, tmpDir, flags }) => {
    // jsc runs multiple script files in order, sharing one global object.
    const shimPath = path.join(tmpDir, CONSOLE_SHIM_FILE);
    return {
      cmd: config.JSCSHELL_PATH,
      args: [BYTECODE_FLAG, ...flags, shimPath, scriptPath],
      spawnOptions: { env: scrubbedEnv },
      extraFiles: [{ path: shimPath, contents: CONSOLE_SHIM }],
    };
  },
});
