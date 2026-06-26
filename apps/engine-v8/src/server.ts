import fastify from "fastify";
import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { z } from "zod";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = fastify({ logger: { level: config.LOG_LEVEL }, bodyLimit: 512 * 1024 });

// Per-pod concurrency gate. Each /run spawns a d8 process that competes for the
// pod's CPU/memory; without a cap a burst of heavy scripts can OOM-kill the pod
// and drop every in-flight request. Excess requests are rejected fast with 503.
let inFlight = 0;

const requestSchema = z.object({
  sourceText: z.string().min(1),
  options: z
    .object({
      flags: z.array(z.string()).optional(),
      timeoutMs: z.number().int().positive().optional()
    })
    .optional()
});

const allowedFlags = new Set([
  "--allow-natives-syntax",
  "--no-liftoff",
  "--no-wasm-async-compilation",
  "--print-all-code",
  "--print-all-exceptions",
  "--print-ast",
  "--print-break-location",
  "--print-builtin-code",
  "--print-builtin-size",
  "--print-bytecode",
  "--print-code",
  "--print-code-verbose",
  "--print-deopt-stress",
  "--print-flag-values",
  "--print-maglev-code",
  "--print-maglev-deopt-verbose",
  "--print-maglev-graph",
  "--print-maglev-graphs",
  "--print-opt-code",
  "--print-opt-source",
  "--print-regexp-bytecode",
  "--print-regexp-code",
  "--print-regexp-graph",
  "--print-scopes",
  "--print-turbolev-frontend",
  "--print-turbolev-inline-functions",
  "--print-wasm-code",
  "--print-wasm-stub-code",
  "--trace-deopt",
  "--trace-ic",
  "--trace-ignition",
  "--trace-maps",
  "--trace-maps-details",
  "--trace-opt",
  "--trace-opt-verbose",
]);

type RunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  outputTruncated: boolean;
};

const openapiDoc = {
  openapi: "3.0.0",
  info: {
    title: "engine-v8",
    version: "1.0.0"
  },
  paths: {
    "/healthz": {
      get: {
        responses: { "200": { description: "ok" } }
      }
    },
    "/openapi.json": {
      get: {
        responses: { "200": { description: "openapi document" } }
      }
    },
    "/run": {
      post: {
        requestBody: { description: "engine run request" },
        responses: { "200": { description: "run response" } }
      }
    }
  }
};

app.get("/healthz", async () => ({ ok: true }));
app.get("/openapi.json", async () => openapiDoc);

function sanitizeFlags(flags: string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of flags.slice(0, config.MAX_FLAGS)) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed.startsWith("-")) continue;
    if (!allowedFlags.has(trimmed)) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  out.sort();
  return out;
}

async function runCommand(cmd: string, args: string[], opts: { timeoutMs: number }): Promise<RunResult> {
  const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  let outputTruncated = false;
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGKILL");
  }, opts.timeoutMs);

  const stopIfNeeded = () => {
    const bytes = Buffer.byteLength(stdout) + Buffer.byteLength(stderr);
    if (bytes > config.MAX_OUTPUT_BYTES) {
      outputTruncated = true;
      child.kill("SIGKILL");
    }
  };

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
    stopIfNeeded();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
    stopIfNeeded();
  });

  return await new Promise<RunResult>((resolve) => {
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code, timedOut, outputTruncated });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ stdout: "", stderr: String(err), exitCode: -1, timedOut, outputTruncated });
    });
  });
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
    reply.code(400).send({ ok: false, error: `sourceText exceeds limit (${config.MAX_SOURCE_LENGTH})` });
    return;
  }

  const timeoutMs = Math.min(parsed.options?.timeoutMs ?? config.DEFAULT_TIMEOUT_MS, config.MAX_TIMEOUT_MS);
  const flags = sanitizeFlags(parsed.options?.flags || []);

  if (inFlight >= config.MAX_CONCURRENCY) {
    reply.code(503).header("Retry-After", "1").send({ ok: false, error: "engine busy" });
    return;
  }
  inFlight++;

  let tmpDir: string | undefined;
  try {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "engine-v8-"));
    const scriptPath = path.join(tmpDir, "snippet.js");
    await fs.writeFile(scriptPath, parsed.sourceText, "utf8");

    // Heap cap is engine-controlled (not client-supplied): a script that
    // allocates past it gets a JS RangeError rather than OOM-killing the pod.
    const result = await runCommand(
      config.D8_PATH,
      [`--max-old-space-size=${config.MAX_HEAP_MB}`, ...flags, scriptPath],
      { timeoutMs }
    );
    if (result.timedOut) {
      reply.code(408).send({ ok: false, error: "execution timed out" });
      return;
    }
    if (result.outputTruncated) {
      reply.code(400).send({ ok: false, error: "output exceeded limit" });
      return;
    }

    reply.send({
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr,
      artifacts: [],
      meta: { durationMs: Date.now() - start, engine: "v8" }
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
    app.log.info(`engine-v8 listening on ${config.HOST}:${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

process.on("SIGTERM", () => app.close().finally(() => process.exit(0)));
process.on("SIGINT", () => app.close().finally(() => process.exit(0)));

listen();
