/**
 * Boots the REAL worker — no workerUrl override — so the entry point, the tsx
 * registration and the engine262 import are all exercised together.
 *
 * The rest of the sandbox suite substitutes test/fixtures/fixture-worker.mts to
 * test budget and queue behaviour without engine262. That left the real entry
 * point uncovered, and it shipped broken: worker.ts was passed to `new Worker`
 * directly, where the tsx loader is not yet in effect, so every trace hung
 * behind a worker that died with `SyntaxError: Invalid or unexpected token`.
 */
import { afterEach, describe, expect, it } from "vitest";
import { TraceSandbox } from "../src/server/execute/sandbox.ts";

let sandbox: TraceSandbox | null = null;

afterEach(async () => {
  await sandbox?.close();
  sandbox = null;
});

describe("real trace worker", () => {
  // Generous budget: this is the one test that pays for a cold engine262 import.
  it("boots through the bootstrap and returns a spec-typed result", async () => {
    sandbox = new TraceSandbox({ budgetMs: 30_000 });

    const response = await sandbox.run({ kind: "unary", functionName: "ToString", input: "true" });

    expect(response.success).toBe(true);
    // Also pins the type-fidelity fix against the real engine: ToString of a
    // Boolean is the STRING "true", which the old display-string round-trip
    // reported back as a Boolean.
    expect(response.result).toEqual({ type: "String", value: "true" });
  }, 60_000);

  it("kills an input that never returns to the event loop", async () => {
    sandbox = new TraceSandbox({ budgetMs: 3_000 });

    await expect(
      sandbox.run({
        kind: "unary",
        functionName: "ToNumber",
        input: "{ valueOf: () => { while (true) {} } }",
      }),
    ).rejects.toThrow(/budget/i);
  }, 60_000);
});
