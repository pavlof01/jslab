import { startEngineServer } from "@jslab/engine-runtime";
import { loadConfig } from "./config.js";

const config = loadConfig();

const BYTECODE_FLAG = "-d" as const;
const allowedFlags = new Set<string>([BYTECODE_FLAG]);

// JSC parses env vars starting with "JSC_" as VM options (Options.cpp).
// `JSC_PATH` is meant for this wrapper, not the engine, and causes noisy stderr.
const scrubbedEnv = { ...process.env };
delete (scrubbedEnv as Record<string, string | undefined>).JSC_PATH;

startEngineServer({
  engine: "jsc",
  allowedFlags,
  // Keep stable order; don't sort (order may matter if more flags are added).
  sortFlags: false,
  tmpPrefix: "engine-jsc-",
  config,
  // NOTE: jsc EXECUTES the script (the -d flag dumps bytecode but the file
  // still runs), unlike sm/hermes which only compile + disassemble. jsc has no
  // portable per-process heap cap (cf. d8's --max-old-space-size), so a single
  // greedy script is bounded only by the concurrency gate + the pod memory limit.
  invoke: ({ scriptPath, flags }) => ({
    cmd: config.JSCSHELL_PATH,
    args: [BYTECODE_FLAG, ...flags, scriptPath],
    spawnOptions: { env: scrubbedEnv },
  }),
});
