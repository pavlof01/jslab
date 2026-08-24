import type { SpawnOptions } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import type { EngineRuntimeConfig } from "./config.js";
import { sanitizeFlags } from "./flags.js";
import { buildLockdownShim, LOCKDOWN_SHIM_FILE } from "./lockdown.js";
import { runCommand } from "./run.js";
import { detectVersion, type VersionProbe } from "./version.js";

/**
 * Shared HTTP wrapper for the engine microservices. Every engine service is a
 * stateless wrapper that: validates the same `{ sourceText, options }` body,
 * enforces the same per-pod concurrency gate, writes the snippet (and any
 * prelude scripts) to a temp dir, spawns a CLI binary with a timeout + output
 * cap, and returns the same `{ ok, stdout, stderr, artifacts, meta }` shape.
 *
 * The only per-engine differences are captured in `EngineSpec`: the engine
 * name, the globals to lock down, and how the binary invocation is built. The
 * flag allowlist is not a per-engine detail any more — it comes from the shared
 * catalog in `flags.ts`, which the api gateway mirrors, so the two layers
 * cannot drift.
 */

/** How to spawn the engine binary for one prepared snippet. */
export interface Invocation {
  cmd: string;
  args: string[];
  /** Extra spawn options (e.g. cwd for spidermonkey, scrubbed env for jsc). */
  spawnOptions?: Pick<SpawnOptions, "cwd" | "env">;
  /** Optional stdin payload; when set, stdin is piped instead of ignored. */
  input?: string;
}

/** A file written into the temp dir before the binary is spawned. */
export interface PreludeScript {
  /** Filename inside the temp dir; the absolute path comes back in `preludePaths`. */
  file: string;
  contents: string;
}

/** What `invoke` is handed once the snippet and its prelude are on disk. */
export interface InvocationContext {
  scriptPath: string;
  tmpDir: string;
  /** The sanitized, client-supplied flag list. */
  flags: string[];
  /**
   * Absolute paths of the prelude scripts, in the order they must load:
   * the lockdown shim (when `blockedGlobals` is set) first, then whatever the
   * spec declared. Shells that run several script arguments in one realm pass
   * these ahead of `scriptPath`; compile-only shells ignore them.
   */
  preludePaths: string[];
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
   * Globals to neutralize in-realm before the snippet runs — set this for any
   * shell that actually executes the snippet. The runtime generates the shim
   * (see lockdown.ts) and hands its path back as the first `preludePaths` entry.
   */
  blockedGlobals?: readonly string[];
  /** Further scripts to load before the snippet, in order (e.g. jsc's console shim). */
  prelude?: readonly PreludeScript[];
  version?: VersionProbe;
  /** Build the binary invocation for a snippet already written to `scriptPath`. */
  invoke(ctx: InvocationContext): Invocation;
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

/**
 * Per-pod concurrency gate. Each /run spawns a process that competes for the
 * pod's CPU/memory; without a cap a burst of heavy scripts can OOM-kill the pod
 * and drop every in-flight request. Excess requests get 429 fast.
 */
class ConcurrencyGate {
  #inFlight = 0;

  constructor(private readonly limit: number) {}

  tryAcquire(): boolean {
    if (this.#inFlight >= this.limit) return false;
    this.#inFlight++;
    return true;
  }

  release(): void {
    this.#inFlight--;
  }
}

interface Workspace {
  scriptPath: string;
  tmpDir: string;
  preludePaths: string[];
  dispose(): Promise<void>;
}

/** The prelude a spec asks for, with the generated lockdown shim ahead of it. */
function preludeScripts(spec: EngineSpec): readonly PreludeScript[] {
  const declared = spec.prelude ?? [];
  if (!spec.blockedGlobals?.length) return declared;
  // Lockdown loads first so the snippet never observes a dangerous global, not
  // even transiently through another prelude script.
  return [
    { file: LOCKDOWN_SHIM_FILE, contents: buildLockdownShim(spec.blockedGlobals) },
    ...declared,
  ];
}

/** Temp dir holding the snippet plus its prelude, cleaned up by `dispose`. */
async function createWorkspace(spec: EngineSpec, sourceText: string): Promise<Workspace> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), spec.tmpPrefix));
  const dispose = () => fs.rm(tmpDir, { recursive: true, force: true });

  try {
    const scriptPath = path.join(tmpDir, "snippet.js");
    await fs.writeFile(scriptPath, sourceText, "utf8");

    const preludePaths: string[] = [];
    for (const script of preludeScripts(spec)) {
      const filePath = path.join(tmpDir, script.file);
      await fs.writeFile(filePath, script.contents, "utf8");
      preludePaths.push(filePath);
    }

    return { scriptPath, tmpDir, preludePaths, dispose };
  } catch (err) {
    await dispose();
    throw err;
  }
}

function openapiDocFor(title: string) {
  return {
    openapi: "3.0.0",
    info: { title, version: "1.0.0" },
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
}

/**
 * Build the engine service's Fastify app without listening, so the request
 * pipeline (validation, gating, spawning, response shaping) can be exercised
 * with `app.inject()` instead of a live pod.
 */
export function buildEngineApp(spec: EngineSpec): FastifyInstance {
  const { config, engine } = spec;
  const app = fastify({ logger: { level: config.LOG_LEVEL }, bodyLimit: 512 * 1024 });
  const gate = new ConcurrencyGate(config.MAX_CONCURRENCY);

  let engineVersion: string | null = null;
  if (spec.version) {
    void detectVersion(spec.version)
      .then((detected) => {
        engineVersion = detected;
      })
      .catch((err) => app.log.warn({ err }, "version probe failed"));
  }

  app.get("/healthz", async () => ({ ok: true, engine: spec.engine, version: engineVersion }));

  if (spec.openapiTitle) {
    const doc = openapiDocFor(spec.openapiTitle);
    app.get("/openapi.json", async () => doc);
  }

  app.post("/run", async (req, reply) => {
    const start = Date.now();

    let parsed: z.infer<typeof requestSchema>;
    try {
      parsed = requestSchema.parse(req.body);
    } catch (err) {
      reply
        .code(400)
        .send({ ok: false, error: err instanceof Error ? err.message : "invalid payload" });
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

    if (!gate.tryAcquire()) {
      // 429 (not 503): the api gateway maps engine 5xx to a generic 502, which
      // would hide the backpressure signal and drop Retry-After. 429 is passed
      // through so clients can back off and retry.
      reply.code(429).header("Retry-After", "1").send({ ok: false, error: "engine busy" });
      return;
    }

    let workspace: Workspace | undefined;
    try {
      workspace = await createWorkspace(spec, parsed.sourceText);
      const inv = spec.invoke({
        scriptPath: workspace.scriptPath,
        tmpDir: workspace.tmpDir,
        flags: sanitized.flags,
        preludePaths: workspace.preludePaths,
      });

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
    } catch (err) {
      reply
        .code(500)
        .send({ ok: false, error: err instanceof Error ? err.message : "execution failed" });
    } finally {
      gate.release();
      await workspace?.dispose();
    }
  });

  return app;
}
