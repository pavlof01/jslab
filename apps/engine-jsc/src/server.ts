import fastify from "fastify";
import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { z } from "zod";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = fastify({ logger: { level: config.LOG_LEVEL }, bodyLimit: 512 * 1024 });

const requestSchema = z.object({
  sourceText: z.string().min(1),
  options: z
    .object({
      flags: z.array(z.string()).optional(),
      timeoutMs: z.number().int().positive().optional(),
    })
    .optional(),
});

const BYTECODE_FLAG = "-d" as const;

const allowedFlags = new Set<string>([BYTECODE_FLAG]);

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
  // NOTE: keep stable order; don't sort (order may matter if you add more flags later)
  return out;
}


async function runCommand(cmd: string, args: string[], opts: { timeoutMs: number }): Promise<RunResult> {
  // JSC parses env vars starting with "JSC_" as VM options (Options.cpp).
  // `JSC_PATH` is meant for this wrapper, not for the engine itself, and causes noisy stderr output.
  const env = { ...process.env };
  delete (env as any).JSC_PATH;

  const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], env });

  let stdout = "";
  let stderr = "";
  let outputTruncated = false;
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    // SIGKILL is fine inside a container; if you want graceful stop first, send SIGTERM then SIGKILL.
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
    let settled = false;
    const done = (r: RunResult) => {
      if (settled) return;
      settled = true;
      resolve(r);
    };

    child.on("close", (code) => {
      clearTimeout(timer);
      done({ stdout, stderr, exitCode: code, timedOut, outputTruncated });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      done({ stdout: "", stderr: String(err), exitCode: -1, timedOut, outputTruncated });
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

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "engine-jsc-"));
  const scriptPath = path.join(tmpDir, "snippet.js");

  try {
    await fs.writeFile(scriptPath, parsed.sourceText, "utf8");

    const result = await runCommand(config.JSCSHELL_PATH, [BYTECODE_FLAG, ...flags, scriptPath], { timeoutMs });

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
      meta: { durationMs: Date.now() - start, engine: "jsc" },
    });
  } catch (err: any) {
    reply.code(500).send({ ok: false, error: err?.message || "execution failed" });
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

const listen = async () => {
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`engine-jsc listening on ${config.HOST}:${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

process.on("SIGTERM", () => app.close().finally(() => process.exit(0)));
process.on("SIGINT", () => app.close().finally(() => process.exit(0)));

listen();
