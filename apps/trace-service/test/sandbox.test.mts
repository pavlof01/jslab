/**
 * Execution-budget tests. They drive the sandbox against test/fixtures/fixture-worker.mts
 * so the runaway case is a real unkillable-by-any-other-means loop in a real worker
 * thread, without pulling engine262 into the test process.
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  BudgetExceededError,
  SandboxBusyError,
  type SandboxTask,
  TraceSandbox,
} from "../src/server/execute/sandbox.ts";

const FIXTURE_WORKER = new URL("./fixtures/fixture-worker.mts", import.meta.url);

/** `input` selects fixture behaviour: "spin" | "fail" | "crash" | anything else. */
const task = (input: string): SandboxTask => ({ kind: "binary", input });

let sandbox: TraceSandbox | undefined;

function createSandbox(options: { budgetMs: number; maxQueueDepth?: number }): TraceSandbox {
  sandbox = new TraceSandbox({ ...options, workerUrl: FIXTURE_WORKER });
  return sandbox;
}

afterEach(async () => {
  await sandbox?.close();
  sandbox = undefined;
});

describe("TraceSandbox", () => {
  it("returns the worker's response for a task that finishes", async () => {
    const result = await createSandbox({ budgetMs: 10_000 }).run(task("[] == ![]"));
    expect(result).toEqual({
      success: true,
      functionName: "Fixture",
      result: { type: "String", value: "[] == ![]" },
    });
  });

  it("aborts a task that never yields to the event loop", async () => {
    const sut = createSandbox({ budgetMs: 500 });
    const started = Date.now();
    await expect(sut.run(task("spin"))).rejects.toBeInstanceOf(BudgetExceededError);
    // The whole point: a synchronous infinite loop is still bounded in wall time.
    expect(Date.now() - started).toBeLessThan(10_000);
  });

  it("serves the next request after a runaway task was killed", async () => {
    // Generous budget: the follow-up task pays for a cold worker boot.
    const sut = createSandbox({ budgetMs: 5_000 });
    await expect(sut.run(task("spin"))).rejects.toBeInstanceOf(BudgetExceededError);
    await expect(sut.run(task("ok"))).resolves.toMatchObject({ success: true });
  });

  it("rejects with SandboxBusyError once the queue is full", async () => {
    const sut = createSandbox({ budgetMs: 5_000, maxQueueDepth: 1 });
    const running = sut.run(task("spin"));
    const queued = sut.run(task("ok"));
    // Attach both expectations before awaiting anything: they settle ~5s from
    // now, and an unhandled rejection in between would fail the run.
    const runningRejects = expect(running).rejects.toBeInstanceOf(BudgetExceededError);
    // The budget is a whole-request deadline measured from enqueue, so the
    // queued task expires behind the spinning one instead of running late: by
    // then the gateway has long since closed the caller's connection, and
    // executing it would only burn CPU nobody is waiting for.
    const queuedRejects = expect(queued).rejects.toBeInstanceOf(BudgetExceededError);

    await expect(sut.run(task("ok"))).rejects.toBeInstanceOf(SandboxBusyError);
    await runningRejects;
    await queuedRejects;
  });

  it("runs a queued task that still has budget left when its turn comes", async () => {
    const sut = createSandbox({ budgetMs: 5_000, maxQueueDepth: 2 });
    // Both tasks are fast, so the second one's deadline is nowhere near expiry
    // when the first completes — queueing itself must not fail a request.
    const [first, second] = await Promise.all([sut.run(task("one")), sut.run(task("two"))]);
    expect(first).toMatchObject({ result: { value: "one" } });
    expect(second).toMatchObject({ result: { value: "two" } });
  });

  it("propagates an error the worker reports", async () => {
    await expect(createSandbox({ budgetMs: 10_000 }).run(task("fail"))).rejects.toThrow(
      "fixture failure",
    );
  });

  it("surfaces a worker crash and recovers on the next task", async () => {
    const sut = createSandbox({ budgetMs: 10_000 });
    await expect(sut.run(task("crash"))).rejects.toThrow("fixture crash");
    await expect(sut.run(task("ok"))).resolves.toMatchObject({ success: true });
  });

  it("rejects everything once closed", async () => {
    const sut = createSandbox({ budgetMs: 10_000 });
    await sut.close();
    await expect(sut.run(task("ok"))).rejects.toThrow("closed");
  });
});
