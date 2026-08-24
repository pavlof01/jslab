/**
 * Stand-in for src/server/execute/worker.ts. It speaks the same protocol but
 * never imports engine262, so the sandbox's budget/queue behaviour can be tested
 * in isolation (and without a submodule checkout).
 *
 * Behaviour is selected by `task.input`.
 */
import { parentPort } from "node:worker_threads";

if (!parentPort) {
  throw new Error("fixture-worker.mts must be started as a worker thread");
}

const port = parentPort;

// Same readiness handshake as the real worker: the host holds tasks until this
// arrives so worker boot is never billed to a caller's budget.
port.postMessage({ ready: true });

port.on("message", ({ id, task }: { id: number; task: { input: string } }) => {
  switch (task.input) {
    case "spin":
      // Mimics `{ valueOf: () => { while (true) {} } }`: synchronous, never yields.
      for (;;) {
        /* deliberately empty */
      }
    case "fail":
      port.postMessage({ id, ok: false, error: "fixture failure" });
      return;
    case "crash":
      throw new Error("fixture crash");
    default:
      port.postMessage({
        id,
        ok: true,
        value: {
          success: true,
          functionName: "Fixture",
          result: { type: "String", value: task.input },
        },
      });
  }
});
