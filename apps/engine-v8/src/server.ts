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

const allowedFlags = new Set(["--print-bytecode", "--trace-ignition", "--trace-deopt", "--allow-natives-syntax", "--no-liftoff", "--no-wasm-async-compilation"]);

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
  components: {
    securitySchemes: {
      EngineKey: { type: "apiKey", name: "x-engine-key", in: "header" }
    }
  },
  security: [{ EngineKey: [] }],
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

function headerOne(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

app.addHook("onRequest", async (req, reply) => {
  if (req.url === "/healthz") return;
  if (config.ENGINE_SHARED_SECRET) {
    const incoming = headerOne(req.headers["x-engine-key"]);
    if (incoming !== config.ENGINE_SHARED_SECRET) {
      return reply.code(401).send({ ok: false, error: "invalid engine key" });
    }
  }
});

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

function ensureBytecodeFlag(flags: string[]): string[] {
  if (!flags.includes("--print-bytecode")) {
    return [...flags, "--print-bytecode"];
  }
  return flags;
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
  let flags = sanitizeFlags(parsed.options?.flags || []);
  if (parsed.task === "bytecode") {
    flags = ensureBytecodeFlag(flags);
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "engine-v8-"));
  const scriptPath = path.join(tmpDir, "snippet.js");
  await fs.writeFile(scriptPath, parsed.sourceText, "utf8");

  try {
    const result = await runCommand(config.D8_PATH, [...flags, scriptPath], { timeoutMs });
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
      meta: { durationMs: Date.now() - start, engine: "v8" }
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
    app.log.info(`engine-v8 listening on ${config.HOST}:${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

process.on("SIGTERM", () => app.close().finally(() => process.exit(0)));
process.on("SIGINT", () => app.close().finally(() => process.exit(0)));

listen();
