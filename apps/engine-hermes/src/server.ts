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
  task: z.enum(["run", "bytecode"]),
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

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "engine-hermes-"));
  const scriptPath = path.join(tmpDir, "snippet.js");
  await fs.writeFile(scriptPath, parsed.sourceText, "utf8");

  try {
    if (parsed.task === "bytecode") {
      const hbcPath = path.join(tmpDir, "program.hbc");
      const compile = await runCommand(config.HERMESC_PATH, ["-emit-binary", "-out", hbcPath, ...flags, scriptPath], { timeoutMs });
      if (compile.timedOut) {
        reply.code(408).send({ ok: false, error: "bytecode compile timed out" });
        return;
      }
      if (compile.outputTruncated) {
        reply.code(400).send({ ok: false, error: "compile output exceeded limit" });
        return;
      }
      if (compile.exitCode !== 0) {
        reply.code(400).send({ ok: false, stdout: compile.stdout, stderr: compile.stderr, artifacts: [] });
        return;
      }
      const dump = await runCommand(config.HBCDUMP_PATH, [hbcPath], { timeoutMs, input: "disassemble\n" });
      if (dump.timedOut) {
        reply.code(408).send({ ok: false, error: "hbcdump timed out" });
        return;
      }
      if (dump.outputTruncated) {
        reply.code(400).send({ ok: false, error: "hbcdump output exceeded limit" });
        return;
      }
      if (dump.exitCode !== 0) {
        reply.code(400).send({ ok: false, stdout: dump.stdout, stderr: dump.stderr, artifacts: [] });
        return;
      }

      const bytecode = await fs.readFile(hbcPath);
      reply.send({
        ok: true,
        stdout: dump.stdout,
        stderr: dump.stderr,
        artifacts: [
          {
            kind: "bytecode" as const,
            mime: "application/octet-stream",
            dataBase64: bytecode.toString("base64")
          }
        ],
        meta: { durationMs: Date.now() - start, engine: "hermes" }
      });
      return;
    }

    const runResult = await runCommand(config.HERMES_PATH, [...flags, scriptPath], { timeoutMs });
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
    await fs.rm(tmpDir, { recursive: true, force: true });
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
