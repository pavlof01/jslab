// app/api/bytecode/route.ts
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { ENGINE_KEYS, EngineKey, isEngineKey } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RunResult = { stdout: string; stderr: string; exitCode: number | null; ms: number };

function binOrHint(err: unknown, hintPath: string) {
  const s = String(err || "");
  if (s.includes("ENOENT")) {
    return `ENOENT: binary not found. Set correct path via env. Tried: ${hintPath}`;
  }
  return s;
}

// === ПУТИ (дефолты под linux x64; переопредели через .env.local) ===
const V8_D8 = process.env.V8_D8 || "engines/v8/out.gn/x64.release/d8";
const SM_JS = process.env.SM_JS || "engines/sm/dist/bin/js"; // поправь под свою сборку
const HERMESC = process.env.HERMESC || "engines/hermes/build_release/bin/hermesc";
const HERMES = process.env.HERMES || "engines/hermes/build_release/bin/hermes";
const HBCDUMP = process.env.HBCDUMP || "engines/hermes/build_release/bin/hbcdump";
// рекомендуем вызывать обёртку (она на mac ставит DYLD_* и добавляет --dumpBytecode)
const JSC_BIN = process.env.JSC || "scripts/jsc.sh";

function runProc(
  cmd: string,
  args: string[],
  opts?: { stdin?: string; timeoutMs?: number; enoentHint?: string }
): Promise<RunResult> {
  const { stdin = "", timeoutMs = 15000, enoentHint = cmd } = opts || {};
  return new Promise((resolve) => {
    const t0 = Date.now();
    const p = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"] });
    let out = "",
      err = "";
    let done = false;

    const killer = setTimeout(() => {
      if (!done) p.kill("SIGKILL");
    }, timeoutMs);
    p.stdout.on("data", (d) => (out += d.toString()));
    p.stderr.on("data", (d) => (err += d.toString()));

    p.on("close", (code) => {
      done = true;
      clearTimeout(killer);
      resolve({ stdout: out, stderr: err, exitCode: code ?? null, ms: Date.now() - t0 });
    });
    p.on("error", (e) => {
      done = true;
      clearTimeout(killer);
      resolve({ stdout: "", stderr: binOrHint(e, enoentHint), exitCode: -1, ms: Date.now() - t0 });
    });

    if (stdin) p.stdin.write(stdin);
    p.stdin.end();
  });
}

// ---- per-engine runners ----

const DEFAULT_V8_FLAG: string | null = null;

function sanitizeV8Flags(value: unknown): string[] {
  const incoming = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];

  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const raw of incoming) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed.startsWith("--")) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    cleaned.push(trimmed);
  }

  if (cleaned.length === 0) {
    return DEFAULT_V8_FLAG ? [DEFAULT_V8_FLAG] : [];
  }

  return cleaned;
}

async function runV8(tmpJs: string, flags: string[]): Promise<RunResult> {
  console.log(`Running V8 with flags: ${flags.join(" ")}`);
  return runProc(V8_D8, [...flags, tmpJs], { enoentHint: V8_D8 });
}

async function runSpiderMonkey(tmpJs: string): Promise<RunResult> {
  const snippet = `
    load('${tmpJs.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}');
    try {
      if (typeof f === 'function') {
        print(dis(f));
      } else {
        let dumped = false;
        for (let k in this) {
          if (typeof this[k] === 'function') {
            print("// disassembly of global function " + k);
            print(dis(this[k]));
            dumped = true;
            break;
          }
        }
        if (!dumped) print("SpiderMonkey: no function to disassemble");
      }
    } catch (e) {
      print("SpiderMonkey disassembly error: " + e);
    }
  `;
  return runProc(SM_JS, ["-e", snippet], { enoentHint: SM_JS });
}

async function runHermes(tmpJs: string, tmpDir: string): Promise<RunResult> {
  const hbc = path.join(tmpDir, "program.hbc");
  const comp = await runProc(HERMESC, ["-emit-binary", "-out", hbc, tmpJs], { enoentHint: HERMESC });
  if (comp.exitCode !== 0) return comp;
  return runProc(HBCDUMP, [hbc], { stdin: "disassemble\n", enoentHint: HBCDUMP });
}

async function runJSC(tmpJs: string): Promise<RunResult> {
  const args = [tmpJs];
  const r = await runProc(JSC_BIN, args, { enoentHint: JSC_BIN });
  return r;
}

// ---- route handler ----

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code: string = body?.code ?? "";
    const enginesReq: unknown = body?.engines ?? ENGINE_KEYS;
    const requestedEngines = Array.isArray(enginesReq) ? enginesReq : ENGINE_KEYS;
    const v8Flags = sanitizeV8Flags(body?.v8Flags);
    const engines = requestedEngines
      .map((value) => (typeof value === "string" ? value : null))
      .filter((value): value is EngineKey => (value ? isEngineKey(value) : false));

    if (!code || engines.length === 0) {
      return NextResponse.json({ ok: false, error: "code or engines missing" }, { status: 400 });
    }

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "js-bytecode-"));
    const tmpJs = path.join(tmpDir, "snippet.js");
    await fs.writeFile(tmpJs, code, "utf8");

    const tasks: Record<EngineKey, Promise<RunResult>> = {
      [EngineKey.v8]: runV8(tmpJs, v8Flags),
      [EngineKey.sm]: runSpiderMonkey(tmpJs),
      [EngineKey.hermes]: runHermes(tmpJs, tmpDir),
      [EngineKey.jsc]: runJSC(tmpJs),
    };

    const pending = engines.map((k) => tasks[k].then((r) => [k, r] as const));
    const settled = await Promise.all(pending);

    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}

    const results = Object.create(null) as Record<EngineKey, RunResult>;
    let totalMs = 0;
    for (const [k, r] of settled) {
      results[k] = r;
      totalMs = Math.max(totalMs, r.ms);
    }

    return NextResponse.json({ ok: true, meta: { ms: totalMs }, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
