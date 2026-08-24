import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildEngineApp,
  type EngineRuntimeConfig,
  type EngineSpec,
  type Invocation,
} from "./index.js";

/**
 * Integration tests for the shared engine service. Every `engine-*` app is this
 * server plus a three-line `invoke()`, so the request contract (validation,
 * flag filtering, timeouts, output caps, backpressure, temp-file lifecycle)
 * is exercised once, here, against the real Fastify routes.
 *
 * The "engine binary" is this process's own `node`, which makes the spawn real
 * without depending on d8/hermesc/jsc/js being installed.
 */

const node = process.execPath;

const baseConfig: EngineRuntimeConfig = {
  PORT: 0,
  HOST: "127.0.0.1",
  LOG_LEVEL: "silent",
  MAX_FLAGS: 10,
  MAX_OUTPUT_BYTES: 64 * 1024,
  MAX_SOURCE_LENGTH: 20_000,
  DEFAULT_TIMEOUT_MS: 5_000,
  MAX_TIMEOUT_MS: 5_000,
  MAX_CONCURRENCY: 4,
};

type SpecOverrides = Partial<Omit<EngineSpec, "config" | "invoke">> & {
  config?: Partial<EngineRuntimeConfig>;
  invoke?: EngineSpec["invoke"];
};

let open: FastifyInstance[] = [];

/**
 * Flags handed to the most recent `invoke()`, per app. Asserting here rather
 * than on the child's argv keeps the test independent of how node itself
 * would interpret a V8 flag it was passed on the command line.
 */
const flagsSeen = new Map<FastifyInstance, string[][]>();

function makeApp(overrides: SpecOverrides = {}): FastifyInstance {
  const { config, invoke, ...rest } = overrides;
  const seen: string[][] = [];

  // Default invocation: run the snippet with node, and record the flags.
  const defaultInvoke: EngineSpec["invoke"] = ({ scriptPath, flags }): Invocation => {
    seen.push(flags);
    return { cmd: node, args: [scriptPath] };
  };

  const app = buildEngineApp({
    engine: "v8",
    tmpPrefix: "engine-runtime-test-",
    config: { ...baseConfig, ...config },
    invoke: invoke ?? defaultInvoke,
    ...rest,
  });
  open.push(app);
  flagsSeen.set(app, seen);
  return app;
}

const flagsFor = (app: FastifyInstance): string[][] => flagsSeen.get(app) ?? [];

afterEach(async () => {
  await Promise.all(open.map((app) => app.close()));
  open = [];
  flagsSeen.clear();
});

const run = (app: FastifyInstance, payload: unknown) =>
  app.inject({ method: "POST", url: "/run", payload: payload as any });

/**
 * The temp dir is removed in the handler's `finally`, which can land just after
 * the response is written — so poll briefly rather than racing it.
 */
async function eventuallyGone(dir: string, timeoutMs = 2000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      await fs.stat(dir);
    } catch {
      return true;
    }
    if (Date.now() > deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

describe("GET /healthz", () => {
  it("answers before any run has happened", async () => {
    const res = await makeApp().inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, engine: "v8", version: null });
  });

  it("reports the binary's version once the startup probe answers", async () => {
    const app = makeApp({
      version: {
        cmd: node,
        candidates: [["-e", "console.log('V8 version 14.9.0 (candidate)')"]],
        parse: (raw: string) => raw.match(/V8 version ([^\n]+)/)?.[1]?.trim() ?? null,
      },
    });
    let version: string | null = null;
    for (let attempt = 0; attempt < 50 && version === null; attempt++) {
      const res = await app.inject({ method: "GET", url: "/healthz" });
      version = res.json().version;
      if (version === null) await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(version).toBe("14.9.0 (candidate)");
  });
});

describe("GET /openapi.json", () => {
  it("is absent unless the spec asks for it", async () => {
    const res = await makeApp().inject({ method: "GET", url: "/openapi.json" });
    expect(res.statusCode).toBe(404);
  });

  it("documents the service when a title is supplied", async () => {
    const res = await makeApp({ openapiTitle: "engine-v8" }).inject({
      method: "GET",
      url: "/openapi.json",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().info.title).toBe("engine-v8");
    expect(Object.keys(res.json().paths)).toContain("/run");
  });
});

describe("POST /run — validation", () => {
  it("rejects a missing sourceText", async () => {
    const res = await run(makeApp(), { options: {} });
    expect(res.statusCode).toBe(400);
    expect(res.json().ok).toBe(false);
  });

  it("rejects an empty sourceText", async () => {
    const res = await run(makeApp(), { sourceText: "" });
    expect(res.statusCode).toBe(400);
  });

  it("rejects a non-integer timeout", async () => {
    const res = await run(makeApp(), { sourceText: "1", options: { timeoutMs: 12.5 } });
    expect(res.statusCode).toBe(400);
  });

  it("rejects sourceText over the configured length", async () => {
    const res = await run(makeApp({ config: { MAX_SOURCE_LENGTH: 16 } }), {
      sourceText: "x".repeat(17),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("sourceText exceeds limit (16)");
  });
});

describe("POST /run — execution", () => {
  it("writes the snippet to a temp file and runs it", async () => {
    const res = await run(makeApp(), { sourceText: 'console.log("hello from the snippet")' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.stdout).toContain("hello from the snippet");
    expect(body.stderr).toBe("");
    expect(body.artifacts).toEqual([]);
    expect(body.meta.engine).toBe("v8");
    expect(typeof body.meta.durationMs).toBe("number");
  });

  it("captures stderr alongside stdout", async () => {
    const res = await run(makeApp(), { sourceText: 'console.error("to stderr")' });
    expect(res.json().stderr).toContain("to stderr");
  });

  it("reports a snippet that throws as a normal run, not a 500", async () => {
    // A failing snippet is the user's program failing, not the service failing.
    const res = await run(makeApp(), { sourceText: 'throw new Error("boom")' });
    expect(res.statusCode).toBe(200);
    expect(res.json().stderr).toContain("boom");
  });

  it("passes sanitized flags through to the binary and reports the rest", async () => {
    const app = makeApp();
    const res = await run(app, {
      sourceText: "1",
      options: { flags: ["--trace-opt", "--not-a-real-flag", "--print-bytecode"] },
    });
    // Sorted by default, so the command line is stable regardless of input order.
    expect(flagsFor(app)[0]).toEqual(["--print-bytecode", "--trace-opt"]);
    expect(res.json().meta.droppedFlags).toEqual(["--not-a-real-flag"]);
  });

  it("filters against the catalog for the spec's own engine", async () => {
    const app = makeApp({ engine: "jsc" });
    // "-d" is a jsc flag; "--print-bytecode" belongs to V8 and must not pass here.
    const res = await run(app, { sourceText: "1", options: { flags: ["-d", "--print-bytecode"] } });
    expect(flagsFor(app)[0]).toEqual(["-d"]);
    expect(res.json().meta.engine).toBe("jsc");
    expect(res.json().meta.droppedFlags).toEqual(["--print-bytecode"]);
  });

  it("preserves the caller's flag order when the spec opts out of sorting", async () => {
    const sorted = makeApp({ engine: "sm" });
    await run(sorted, { sourceText: "1", options: { flags: ["--ion-eager", "--baseline-eager"] } });
    expect(flagsFor(sorted)[0]).toEqual(["--baseline-eager", "--ion-eager"]);

    const unsorted = makeApp({ engine: "sm", sortFlags: false });
    await run(unsorted, {
      sourceText: "1",
      options: { flags: ["--ion-eager", "--baseline-eager"] },
    });
    expect(flagsFor(unsorted)[0]).toEqual(["--ion-eager", "--baseline-eager"]);
  });

  it("omits droppedFlags from meta when every flag was accepted", async () => {
    const res = await run(makeApp(), { sourceText: "1", options: { flags: ["--print-bytecode"] } });
    expect(res.json().meta).not.toHaveProperty("droppedFlags");
  });

  it("caps the flag list at MAX_FLAGS", async () => {
    const app = makeApp({ config: { MAX_FLAGS: 2 } });
    const res = await run(app, {
      sourceText: "1",
      options: { flags: ["--print-bytecode", "--trace-opt", "--trace-ic"] },
    });
    expect(flagsFor(app)[0]).toEqual(["--print-bytecode", "--trace-opt"]);
    expect(res.json().meta.droppedFlags).toEqual(["--trace-ic"]);
  });
});

describe("POST /run — timeouts and output limits", () => {
  it("returns 408 when the snippet outlives its budget", async () => {
    const res = await run(makeApp({ config: { MAX_TIMEOUT_MS: 400 } }), {
      sourceText: "while (true) {}",
      options: { timeoutMs: 300 },
    });
    expect(res.statusCode).toBe(408);
    expect(res.json()).toEqual({ ok: false, error: "execution timed out" });
  });

  it("clamps a caller timeout above MAX_TIMEOUT_MS", async () => {
    const res = await run(makeApp({ config: { MAX_TIMEOUT_MS: 300 } }), {
      sourceText: "while (true) {}",
      options: { timeoutMs: 60_000 },
    });
    // Without the clamp this test would hang for a minute instead of timing out.
    expect(res.statusCode).toBe(408);
  });

  it("keeps what fits and flags truncation instead of failing the run", async () => {
    const res = await run(makeApp({ config: { MAX_OUTPUT_BYTES: 16 * 1024 } }), {
      sourceText: 'for (let i = 0; i < 1e6; i++) process.stdout.write("0123456789");',
    });
    const body = res.json();
    expect(res.statusCode).toBe(200);
    expect(body.meta.outputTruncated).toBe(true);
    expect(body.meta.outputLimitBytes).toBe(16 * 1024);
    expect(body.stdout.length).toBeGreaterThan(0);
    expect(Buffer.byteLength(body.stdout) + Buffer.byteLength(body.stderr)).toBeLessThanOrEqual(
      16 * 1024,
    );
  });
});

describe("POST /run — backpressure", () => {
  it("429s with Retry-After once the pod's concurrency gate is full", async () => {
    const app = makeApp({ config: { MAX_CONCURRENCY: 1 } });
    const slow = run(app, { sourceText: "setTimeout(() => {}, 400)" });
    // Give the first request time to enter the gate before the second arrives.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const rejected = await run(app, { sourceText: "1" });

    expect(rejected.statusCode).toBe(429);
    expect(rejected.headers["retry-after"]).toBe("1");
    expect(rejected.json()).toEqual({ ok: false, error: "engine busy" });

    // The gate must release once the in-flight run finishes.
    expect((await slow).statusCode).toBe(200);
    expect((await run(app, { sourceText: "1" })).statusCode).toBe(200);
  });

  it("releases the gate even when the invocation itself throws", async () => {
    const app = makeApp({
      config: { MAX_CONCURRENCY: 1 },
      invoke: () => {
        throw new Error("spec blew up");
      },
    });

    const first = await run(app, { sourceText: "1" });
    expect(first.statusCode).toBe(500);
    expect(first.json().error).toBe("spec blew up");

    // A leaked slot would turn every later request into a 429.
    const second = await run(app, { sourceText: "1" });
    expect(second.statusCode).toBe(500);
  });
});

describe("POST /run — invocation contract", () => {
  it("hands invoke() a script path inside a fresh temp dir and cleans it up", async () => {
    const seen: Array<{ scriptPath: string; tmpDir: string }> = [];
    const app = makeApp({
      invoke: ({ scriptPath, tmpDir }) => {
        seen.push({ scriptPath, tmpDir });
        return { cmd: node, args: ["-e", "0"] };
      },
    });

    await run(app, { sourceText: "const marker = 1;" });
    await run(app, { sourceText: "const marker = 2;" });

    expect(seen).toHaveLength(2);
    expect(seen[0].tmpDir).not.toBe(seen[1].tmpDir);
    for (const { scriptPath, tmpDir } of seen) {
      expect(tmpDir.startsWith(os.tmpdir())).toBe(true);
      expect(path.basename(tmpDir).startsWith("engine-runtime-test-")).toBe(true);
      expect(scriptPath).toBe(path.join(tmpDir, "snippet.js"));
      // The temp dir is removed after the response, whatever the outcome.
      expect(await eventuallyGone(tmpDir)).toBe(true);
    }
  });

  it("writes the snippet verbatim for the binary to read", async () => {
    const app = makeApp({
      invoke: ({ scriptPath }) => ({
        cmd: node,
        args: [
          "-e",
          `process.stdout.write(require("fs").readFileSync(${JSON.stringify(scriptPath)}, "utf8"))`,
        ],
      }),
    });
    const source = 'const x = "héllo ☃";\n';
    expect((await run(app, { sourceText: source })).json().stdout).toBe(source);
  });

  it("writes the prelude a spec declares and hands back its path", async () => {
    const app = makeApp({
      prelude: [{ file: "prelude.js", contents: "// prelude contents" }],
      invoke: ({ preludePaths }) => ({
        cmd: node,
        args: [
          "-e",
          `process.stdout.write(require("fs").readFileSync(${JSON.stringify(preludePaths[0])}, "utf8"))`,
        ],
      }),
    });
    expect((await run(app, { sourceText: "1" })).json().stdout).toBe("// prelude contents");
  });

  it("pipes the spec's stdin payload into the binary", async () => {
    const app = makeApp({
      invoke: () => ({
        cmd: node,
        args: ["-e", "process.stdin.pipe(process.stdout)"],
        input: "piped stdin payload",
      }),
    });
    expect((await run(app, { sourceText: "1" })).json().stdout).toBe("piped stdin payload");
  });

  it("honours the spawn options a spec supplies", async () => {
    const app = makeApp({
      invoke: ({ tmpDir }) => ({
        cmd: node,
        args: ["-e", "process.stdout.write(process.cwd() + '|' + (process.env.SECRET ?? 'unset'))"],
        spawnOptions: { cwd: tmpDir, env: { PATH: process.env.PATH ?? "" } },
      }),
    });
    const stdout = (await run(app, { sourceText: "1" })).json().stdout;
    const [cwd, secret] = stdout.split("|");
    expect(cwd.startsWith(os.tmpdir()) || cwd.startsWith(`/private${os.tmpdir()}`)).toBe(true);
    // A scrubbed env must not inherit this process's variables.
    expect(secret).toBe("unset");
  });

  it("reports a missing binary as a run with the spawn error on stderr", async () => {
    const app = makeApp({ invoke: () => ({ cmd: "definitely-not-a-real-binary-xyz", args: [] }) });
    const res = await run(app, { sourceText: "1" });
    expect(res.statusCode).toBe(200);
    expect(res.json().stderr).toContain("ENOENT");
  });
});
