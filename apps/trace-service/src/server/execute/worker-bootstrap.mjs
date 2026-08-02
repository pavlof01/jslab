/**
 * Plain-JS entry point for the trace worker.
 *
 * The worker body is TypeScript, and a worker thread does not inherit the
 * parent's tsx loader. Passing `execArgv: ["--import", "tsx"]` looks like it
 * should cover that, but the loader is not in effect by the time Node compiles
 * the entry module, so worker.ts was parsed as plain JavaScript and died with
 * `SyntaxError: Invalid or unexpected token` before it could run anything.
 *
 * This file is .mjs precisely so it always parses. It registers tsx from inside
 * the worker and only then pulls in the TypeScript body.
 */
import { register } from "tsx/esm/api";

register();

await import("./worker.ts");
