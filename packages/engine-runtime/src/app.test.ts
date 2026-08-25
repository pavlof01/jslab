import fs from "fs/promises";
import { afterEach, describe, expect, it } from "vitest";

import { buildEngineApp, type EngineSpec } from "./app.js";
import { engineEnvBase } from "./config.js";

/**
 * The engine services are thin specs over this app, so the pipeline they all
 * share — validation, the concurrency gate, the prelude, temp-dir cleanup — is
 * tested here once instead of once per pod.
 *
 * The "engine binary" is node itself: it concatenates every file it is handed,
 * which makes both the contents and the LOAD ORDER of the prelude observable in
 * stdout. Nothing here needs d8/jsc installed.
 */
const CAT_FILES =
  'const fs = require("fs"); for (const p of process.argv.slice(1)) process.stdout.write(fs.readFileSync(p, "utf8"));';

const baseConfig = engineEnvBase.parse({ MAX_CONCURRENCY: "4", LOG_LEVEL: "silent" });

const apps: Array<{ close(): Promise<unknown> }> = [];

function makeApp(overrides: Partial<EngineSpec> = {}) {
  const spec: EngineSpec = {
    engine: "v8",
    tmpPrefix: "engine-test-",
    config: baseConfig,
    invoke: ({ scriptPath, preludePaths }) => ({
      cmd: process.execPath,
      args: ["-e", CAT_FILES, ...preludePaths, scriptPath],
    }),
    ...overrides,
  };
  const app = buildEngineApp(spec);
  apps.push(app);
  return app;
}

const run = (app: ReturnType<typeof makeApp>, payload: unknown) =>
  app.inject({ method: "POST", url: "/run", payload: payload as object });

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("buildEngineApp", () => {
  it("runs the snippet and reports the engine it ran on", async () => {
    const res = await run(makeApp(), { sourceText: 'console.log("hi");' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.stdout).toBe('console.log("hi");');
    expect(body.meta.engine).toBe("v8");
  });

  it("loads the lockdown shim before the declared prelude, and both before the snippet", async () => {
    // Order is the whole point of the lockdown: a snippet must never observe a
    // dangerous global, not even through another prelude script.
    const app = makeApp({
      blockedGlobals: ["read", "readbuffer"],
      prelude: [{ file: "console-shim.js", contents: "/* console shim */\n" }],
    });

    const body = (await run(app, { sourceText: "/* snippet */" })).json();
    const lockdownAt = body.stdout.indexOf('"read"');
    const shimAt = body.stdout.indexOf("console shim");
    const snippetAt = body.stdout.indexOf("snippet");

    expect(lockdownAt).toBeGreaterThanOrEqual(0);
    expect(lockdownAt).toBeLessThan(shimAt);
    expect(shimAt).toBeLessThan(snippetAt);
    expect(body.stdout).toContain('"readbuffer"');
  });

  it("writes no lockdown shim for a compile-only engine", async () => {
    const body = (await run(makeApp(), { sourceText: "/* snippet */" })).json();
    expect(body.stdout).toBe("/* snippet */");
  });

  it("removes the temp dir once the run is over", async () => {
    let seen = "";
    const app = makeApp({
      blockedGlobals: ["read"],
      invoke: ({ scriptPath, tmpDir, preludePaths }) => {
        seen = tmpDir;
        return { cmd: process.execPath, args: ["-e", CAT_FILES, ...preludePaths, scriptPath] };
      },
    });

    await run(app, { sourceText: "1;" });
    // Cleanup runs in the handler's `finally`, which the reply does not wait
    // on — the caller gets its output without paying for the rm. So poll rather
    // than assert the directory is already gone the instant the response lands.
    await expect
      .poll(() =>
        fs.stat(seen).then(
          () => true,
          () => false,
        ),
      )
      .toBe(false);
  });

  it("reports flags the catalog rejected instead of swallowing them", async () => {
    const body = (
      await run(makeApp(), {
        sourceText: "1;",
        options: { flags: ["--print-bytecode", "--definitely-not-a-flag"] },
      })
    ).json();
    expect(body.meta.droppedFlags).toEqual(["--definitely-not-a-flag"]);
  });

  it("rejects a snippet over the source limit", async () => {
    const app = makeApp({ config: { ...baseConfig, MAX_SOURCE_LENGTH: 10 } });
    const res = await run(app, { sourceText: "x".repeat(11) });
    expect(res.statusCode).toBe(400);
  });

  it("rejects a payload that is not a run request", async () => {
    expect((await run(makeApp(), { nope: true })).statusCode).toBe(400);
  });

  it("answers 429 with Retry-After once the pod's concurrency is spent", async () => {
    const app = makeApp({
      config: { ...baseConfig, MAX_CONCURRENCY: 1 },
      invoke: () => ({ cmd: process.execPath, args: ["-e", "setTimeout(() => {}, 300);"] }),
    });

    const [first, second] = await Promise.all([
      run(app, { sourceText: "1;" }),
      run(app, { sourceText: "2;" }),
    ]);
    const statuses = [first.statusCode, second.statusCode].sort();
    expect(statuses).toEqual([200, 429]);

    const busy = first.statusCode === 429 ? first : second;
    expect(busy.headers["retry-after"]).toBe("1");

    // The gate must hand the slot back, or the pod answers 429 forever.
    expect((await run(app, { sourceText: "3;" })).statusCode).toBe(200);
  });

  it("answers 408 when the snippet outruns its timeout", async () => {
    const app = makeApp({
      invoke: () => ({ cmd: process.execPath, args: ["-e", "while (true) {}"] }),
    });
    const res = await run(app, { sourceText: "1;", options: { timeoutMs: 200 } });
    expect(res.statusCode).toBe(408);
  });

  it("serves an openapi document only when the spec asks for one", async () => {
    expect((await makeApp().inject({ method: "GET", url: "/openapi.json" })).statusCode).toBe(404);
    const documented = makeApp({ openapiTitle: "engine-test" });
    const res = await documented.inject({ method: "GET", url: "/openapi.json" });
    expect(res.json().info.title).toBe("engine-test");
  });
});
