/**
 * Worker-thread entry point for trace execution. Everything engine262 touches
 * lives here, on a thread the host can terminate (see sandbox.ts).
 */
import { parentPort } from "node:worker_threads";

import { executeBinaryExpression, executeUnaryConversion } from "./index.ts";
import type { SandboxReply, SandboxTask } from "./sandbox.ts";

if (!parentPort) {
  throw new Error("worker.ts must be started as a worker thread");
}

const port = parentPort;

// Announce readiness only once the imports above have resolved — importing
// engine262 through the tsx loader is by far the slowest part of a worker's
// life, and the host must not bill it to a caller's execution budget.
port.postMessage({ ready: true } satisfies SandboxReply);

port.on("message", ({ id, task }: { id: number; task: SandboxTask }) => {
  void (async () => {
    let reply: SandboxReply;
    try {
      const value =
        task.kind === "unary"
          ? await executeUnaryConversion(task.functionName, task.input, task.preferredType)
          : await executeBinaryExpression(task.input);
      reply = { id, ok: true, value };
    } catch (error) {
      reply = { id, ok: false, error: error instanceof Error ? error.message : String(error) };
    }
    port.postMessage(reply);
  })();
});
