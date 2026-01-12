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

const allowedFlags = new Set(["--baseline-eager", "--ion-eager"]);

type RunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  outputTruncated: boolean;
};

app.addHook("onRequest", async (req, reply) => {
  if (req.url === "/healthz") return;
  if (config.ENGINE_SHARED_SECRET) {
    const incoming = req.headers["x-engine-key"];
    if (incoming !== config.ENGINE_SHARED_SECRET) {
      return reply.code(401).send({ ok: false, error: "invalid engine key" });
    }
  }
});

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

async function runCommand(cmd: string, args: string[], opts: { timeoutMs: number; cwd?: string }): Promise<RunResult> {
  const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], cwd: opts.cwd });
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

const BYTECODE_WRAPPER = String.raw`(() => {
  const readFile = typeof read === "function" ? read : null;
  const disFn =
    typeof dis === "function"
      ? dis
      : typeof disassemble === "function"
        ? disassemble
        : typeof disassembleScript === "function"
          ? disassembleScript
          : null;

  if (!readFile) {
    print("ERROR: SpiderMonkey shell 'read()' is not available");
    quit(2);
  }
  if (!disFn) {
    print("ERROR: SpiderMonkey disassembler is not available (expected dis()/disassemble())");
    quit(2);
  }

  const source = readFile("snippet.js");
  let fn;
  try {
    fn = new Function(source);
  } catch (e) {
    print("ERROR: compile failed");
    print(String(e));
    quit(1);
  }

  disFn(fn);
})();`;

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

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "engine-sm-"));
  const scriptPath = path.join(tmpDir, "snippet.js");
  await fs.writeFile(scriptPath, parsed.sourceText, "utf8");

  try {
    const args = parsed.task === "bytecode" ? [...flags, "-e", BYTECODE_WRAPPER] : [...flags, scriptPath];
    const result = await runCommand(config.SM_PATH, args, { timeoutMs, cwd: tmpDir });
    if (result.timedOut) {
      reply.code(408).send({ ok: false, error: "execution timed out" });
      return;
    }
    if (result.outputTruncated) {
      reply.code(400).send({ ok: false, error: "output exceeded limit" });
      return;
    }

    const artifacts =
      parsed.task === "bytecode"
        ? [
            {
              kind: "bytecode" as const,
              mime: "text/plain",
              dataBase64: Buffer.from(result.stdout || "", "utf8").toString("base64")
            }
          ]
        : [];

    reply.send({
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr,
      artifacts,
      meta: { durationMs: Date.now() - start, engine: "sm" }
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
    app.log.info(`engine-spidermonkey listening on ${config.HOST}:${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

process.on("SIGTERM", () => app.close().finally(() => process.exit(0)));
process.on("SIGINT", () => app.close().finally(() => process.exit(0)));

listen();
