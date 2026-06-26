import fastify from "fastify";
import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { z } from "zod";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = fastify({ logger: { level: config.LOG_LEVEL }, bodyLimit: 512 * 1024 });

// Per-pod concurrency gate. Each /run spawns a hermes process; without a cap a
// burst can starve the pod and drop every in-flight request. Excess get 503.
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

const allowedFlags = new Set(["-O", "-gc-sanitize-handles", "-strict"]);

type RunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  outputTruncated: boolean;
};

app.get("/healthz", async () => ({ ok: true }));

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

async function runCommand(cmd: string, args: string[], opts: { timeoutMs: number; input?: string }): Promise<RunResult> {
  const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"] });
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

  if (opts.input) {
    child.stdin.write(opts.input);
  }
  child.stdin.end();

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
    // 429 (not 503): the api gateway maps engine 5xx to a generic 502, which
    // would hide the backpressure signal and drop Retry-After. 429 is passed
    // through so clients can back off and retry.
    reply.code(429).header("Retry-After", "1").send({ ok: false, error: "engine busy" });
    return;
  }
  inFlight++;

  let tmpDir: string | undefined;
  try {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "engine-hermes-"));
    const scriptPath = path.join(tmpDir, "snippet.js");
    await fs.writeFile(scriptPath, parsed.sourceText, "utf8");

    const runResult = await runCommand(config.HERMES_PATH, ["-dump-bytecode", ...flags, scriptPath], { timeoutMs });
    if (runResult.timedOut) {
      reply.code(408).send({ ok: false, error: "execution timed out" });
      return;
    }
    if (runResult.outputTruncated) {
      reply.code(400).send({ ok: false, error: "output exceeded limit" });
      return;
    }

    reply.send({
      ok: true,
      stdout: runResult.stdout,
      stderr: runResult.stderr,
      artifacts: [],
      meta: { durationMs: Date.now() - start, engine: "hermes" }
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
    app.log.info(`engine-hermes listening on ${config.HOST}:${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

process.on("SIGTERM", () => app.close().finally(() => process.exit(0)));
process.on("SIGINT", () => app.close().finally(() => process.exit(0)));

listen();
