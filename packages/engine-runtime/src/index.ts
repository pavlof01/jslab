import type { SpawnOptions } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify from "fastify";
import { z } from "zod";
import { sanitizeFlags } from "./flags.js";
import { runCommand } from "./run.js";

export * from "./flags.js";

/**
 * Shared HTTP wrapper for the engine microservices. Every engine service is a
 * stateless wrapper that: validates the same `{ sourceText, options }` body,
 * enforces the same per-pod concurrency gate, writes the snippet to a temp
 * file, spawns a CLI binary with a timeout + output cap, and returns the same
 * `{ ok, stdout, stderr, artifacts, meta }` shape.
 *
 * The only per-engine differences are captured in `EngineSpec`: the engine
 * name and how the binary invocation is built. The flag allowlist is not a
 * per-engine detail any more — it comes from the shared catalog in `flags.ts`,
 * which the api gateway mirrors, so the two layers cannot drift.
 */

/** Config fields the shared runtime needs; each engine's config is a superset. */
export interface EngineRuntimeConfig {
  PORT: number;
  HOST: string;
  LOG_LEVEL: string;
  MAX_FLAGS: number;
  MAX_OUTPUT_BYTES: number;
  MAX_SOURCE_LENGTH: number;
  DEFAULT_TIMEOUT_MS: number;
  MAX_TIMEOUT_MS: number;
  MAX_CONCURRENCY: number;
}

/** How to spawn the engine binary for one prepared snippet. */
export interface Invocation {
  cmd: string;
  args: string[];
  /** Extra spawn options (e.g. cwd for spidermonkey, scrubbed env for jsc). */
  spawnOptions?: Pick<SpawnOptions, "cwd" | "env">;
  /** Optional stdin payload; when set, stdin is piped instead of ignored. */
  input?: string;
  /**
   * Extra files written into the temp dir before the binary is spawned, e.g.
   * a prelude script the engine loads ahead of the snippet. Paths must be
   * absolute (build them from the `tmpDir` handed to `invoke`).
   */
  extraFiles?: ReadonlyArray<{ path: string; contents: string }>;
}

export interface EngineSpec {
  /** Short engine key echoed back in `meta.engine`; also the flag catalog key. */
  engine: string;
  /** Sort sanitized flags for a stable order. Default true; jsc opts out. */
  sortFlags?: boolean;
  /** mkdtemp prefix, e.g. "engine-v8-". */
  tmpPrefix: string;
  /** When set, expose GET /openapi.json with this title. */
  openapiTitle?: string;
  config: EngineRuntimeConfig;
  /**
   * Build the binary invocation for a snippet already written to `scriptPath`
   * inside `tmpDir`. `flags` is the sanitized, client-supplied flag list.
   */
  invoke(ctx: { scriptPath: string; tmpDir: string; flags: string[] }): Invocation;
}

const requestSchema = z.object({
  sourceText: z.string().min(1),
  options: z
    .object({
      flags: z.array(z.string()).optional(),
      timeoutMs: z.number().int().positive().optional(),
    })
    .optional(),
});

export function startEngineServer(spec: EngineSpec): void {
  const { config, engine } = spec;
  const app = fastify({ logger: { level: config.LOG_LEVEL }, bodyLimit: 512 * 1024 });

  // Per-pod concurrency gate. Each /run spawns a process that competes for the
  // pod's CPU/memory; without a cap a burst of heavy scripts can OOM-kill the
  // pod and drop every in-flight request. Excess requests get 429 fast.
  let inFlight = 0;

  app.get("/healthz", async () => ({ ok: true }));

  if (spec.openapiTitle) {
    const openapiDoc = {
      openapi: "3.0.0",
      info: { title: spec.openapiTitle, version: "1.0.0" },
      paths: {
        "/healthz": { get: { responses: { "200": { description: "ok" } } } },
        "/openapi.json": { get: { responses: { "200": { description: "openapi document" } } } },
        "/run": {
          post: {
            requestBody: { description: "engine run request" },
            responses: { "200": { description: "run response" } },
          },
        },
      },
    };
    app.get("/openapi.json", async () => openapiDoc);
  }

  app.post("/run", async (req, reply) => {
    const start = Date.now();
    let parsed: z.infer<typeof requestSchema>;
    try {
      parsed = requestSchema.parse(req.body);
    } catch (err: any) {
      reply.code(400).send({ ok: false, error: err?.message || "invalid payload" });
      return;
    }

    if (parsed.sourceText.length > config.MAX_SOURCE_LENGTH) {
      reply
        .code(400)
        .send({ ok: false, error: `sourceText exceeds limit (${config.MAX_SOURCE_LENGTH})` });
      return;
    }

    const timeoutMs = Math.min(
      parsed.options?.timeoutMs ?? config.DEFAULT_TIMEOUT_MS,
      config.MAX_TIMEOUT_MS,
    );
    const sanitized = sanitizeFlags(engine, parsed.options?.flags || [], {
      maxFlags: config.MAX_FLAGS,
      sort: spec.sortFlags,
    });

    if (inFlight >= config.MAX_CONCURRENCY) {
      // 429 (not 503): the api gateway maps engine 5xx to a generic 502, which
      // would hide the backpressure signal and drop Retry-After. 429 is passed
      // through so clients can back off and retry.
      reply.code(429).header("Retry-After", "1").send({ ok: false, error: "engine busy" });
      return;
    }
    inFlight++;

    let tmpDir: string | undefined;
    try {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), spec.tmpPrefix));
      const scriptPath = path.join(tmpDir, "snippet.js");
      await fs.writeFile(scriptPath, parsed.sourceText, "utf8");

      const inv = spec.invoke({ scriptPath, tmpDir, flags: sanitized.flags });
      for (const file of inv.extraFiles ?? []) {
        await fs.writeFile(file.path, file.contents, "utf8");
      }
      const result = await runCommand(inv.cmd, inv.args, {
        timeoutMs,
        maxOutputBytes: config.MAX_OUTPUT_BYTES,
        spawnOptions: inv.spawnOptions,
        input: inv.input,
      });

      if (result.timedOut) {
        reply.code(408).send({ ok: false, error: "execution timed out" });
        return;
      }
      // Overflowing the output budget is not an error: the most instructive V8
      // flags (--print-all-code, --trace-ic) blow past it on any real snippet,
      // and discarding everything turned them into a guaranteed 400. Keep what
      // fits and say so in meta. outputLimitBytes is the true ceiling for the
      // whole body: runCommand caps stdout + stderr *combined* at this value,
      // so the gateway can size its cache guard against it.
      reply.send({
        ok: true,
        stdout: result.stdout,
        stderr: result.stderr,
        artifacts: [],
        meta: {
          durationMs: Date.now() - start,
          engine,
          ...(result.outputTruncated
            ? { outputTruncated: true, outputLimitBytes: config.MAX_OUTPUT_BYTES }
            : {}),
          ...(sanitized.dropped.length ? { droppedFlags: sanitized.dropped } : {}),
        },
      });
    } catch (err: any) {
      reply.code(500).send({ ok: false, error: err?.message || "execution failed" });
    } finally {
      inFlight--;
      if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  const listen = async () => {
    try {
      await app.listen({ port: config.PORT, host: config.HOST });
      app.log.info(`engine-${engine} listening on ${config.HOST}:${config.PORT}`);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => app.close().finally(() => process.exit(0)));
  process.on("SIGINT", () => app.close().finally(() => process.exit(0)));

  listen();
}
