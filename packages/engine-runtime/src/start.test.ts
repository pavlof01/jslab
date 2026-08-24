import net from "node:net";

import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { type EngineRuntimeConfig, startEngineServer } from "./index.js";

/**
 * `startEngineServer` is what every engine service's `src/server.ts` actually
 * calls, so the boot path (bind a port, serve, tear down on SIGTERM) gets one
 * real test over a real socket rather than `inject()`.
 */

/** Ask the OS for a free port, then hand it to the server we are about to start. */
async function freePort(): Promise<number> {
  const probe = net.createServer();
  await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = (probe.address() as net.AddressInfo).port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return port;
}

function config(port: number): EngineRuntimeConfig {
  return {
    PORT: port,
    HOST: "127.0.0.1",
    LOG_LEVEL: "silent",
    MAX_FLAGS: 10,
    MAX_OUTPUT_BYTES: 64 * 1024,
    MAX_SOURCE_LENGTH: 20_000,
    DEFAULT_TIMEOUT_MS: 5_000,
    MAX_TIMEOUT_MS: 5_000,
    MAX_CONCURRENCY: 2,
  };
}

async function waitForHealth(port: number, timeoutMs = 5_000): Promise<Response> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      return await fetch(`http://127.0.0.1:${port}/healthz`);
    } catch (err) {
      if (Date.now() > deadline) throw err;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}

const signals: NodeJS.Signals[] = ["SIGTERM", "SIGINT"];
const before = new Map(signals.map((signal) => [signal, process.listeners(signal).slice()]));

let started: FastifyInstance[] = [];

function start(spec: Parameters<typeof startEngineServer>[0]): FastifyInstance {
  const app = startEngineServer(spec);
  started.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(started.map((app) => app.close()));
  started = [];
  // The server installs process-wide shutdown handlers that call process.exit;
  // leaving them attached would kill the test runner on the next signal.
  for (const signal of signals) {
    for (const listener of process.listeners(signal)) {
      if (!before.get(signal)!.includes(listener)) process.off(signal, listener as any);
    }
  }
});

describe("startEngineServer", () => {
  it("binds the configured port and serves runs over HTTP", async () => {
    const port = await freePort();
    start({
      engine: "v8",
      tmpPrefix: "engine-runtime-start-test-",
      config: config(port),
      invoke: ({ scriptPath }) => ({ cmd: process.execPath, args: [scriptPath] }),
    });

    const health = await waitForHealth(port);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ ok: true, engine: "v8", version: null });

    const res = await fetch(`http://127.0.0.1:${port}/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceText: 'console.log("over the wire")' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; stdout: string; meta: { engine: string } };
    expect(body.ok).toBe(true);
    expect(body.stdout).toContain("over the wire");
    expect(body.meta.engine).toBe("v8");

    // Shutting down is the handler the deploy's SIGTERM would reach.
    const shutdown = process
      .listeners("SIGTERM")
      .filter((l) => !before.get("SIGTERM")!.includes(l));
    expect(shutdown).toHaveLength(1);
  });

  it("registers one shutdown handler per signal", async () => {
    const port = await freePort();
    start({
      engine: "hermes",
      tmpPrefix: "engine-runtime-start-test-",
      config: config(port),
      invoke: ({ scriptPath }) => ({ cmd: process.execPath, args: [scriptPath] }),
    });
    await waitForHealth(port);

    for (const signal of signals) {
      const added = process.listeners(signal).filter((l) => !before.get(signal)!.includes(l));
      expect(added).toHaveLength(1);
    }
  });
});
