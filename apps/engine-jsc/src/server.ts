import path from "node:path";
import { startEngineServer } from "@jslab/engine-runtime";
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

// jsc EXECUTES the snippet (see the comment on `invoke` below), and the jsc
// shell exposes filesystem primitives as plain globals: readFile/writeFile can
// read or write anything the container user can reach (including the mounted
// ServiceAccount token), and load/run/runString load and execute another file
// by path. None of this is gated behind a flag we could drop from the
// allowlist, so it has to be neutralized in-realm before the snippet runs.
// Reassignment (not `delete`) because these are ordinary writable globals in
// the jsc shell, and overwriting works even if a future build makes them
// non-configurable; wrapped in try/catch per-name so one already-frozen
// global can't stop the rest from being locked down.
const BLOCKED_GLOBALS = [
  "readFile",
  "writeFile",
  "openFile",
  "load",
  "run",
  "runString",
  "readline",
  "checkSyntax",
  "checkModuleSyntax",
] as const;
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

// JSC parses env vars starting with "JSC_" as VM options (Options.cpp).
// `JSC_PATH` is meant for this wrapper, not the engine, and causes noisy stderr.
const scrubbedEnv = { ...process.env };
// The rule's suggested rewrite (assigning undefined) would keep JSC_PATH as an
// own key of the object handed to spawn(); it has to be gone, not blank.
// biome-ignore lint/performance/noDelete: the key must be absent from the child env.
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
    // Lockdown must load before the console shim and the snippet, so the
    // snippet never observes the dangerous globals even transiently.
    const lockdownPath = path.join(tmpDir, LOCKDOWN_SHIM_FILE);
    const shimPath = path.join(tmpDir, CONSOLE_SHIM_FILE);
    return {
      cmd: config.JSCSHELL_PATH,
      args: [BYTECODE_FLAG, ...flags, lockdownPath, shimPath, scriptPath],
      spawnOptions: { env: scrubbedEnv },
      extraFiles: [
        { path: lockdownPath, contents: LOCKDOWN_SHIM },
        { path: shimPath, contents: CONSOLE_SHIM },
      ],
    };
  },
});
