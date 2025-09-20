// app/api/bytecode/route.ts
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Engine = "v8" | "sm" | "hermes";
type RunResult = { stdout: string; stderr: string; exitCode: number | null; ms: number };

const V8_D8 = process.env.V8_D8 || "engines/v8/out.gn/arm64.release/d8";
const SM_JS = process.env.SM_JS || "engines/spidermonkey/obj-aarch64-apple-darwin24.6.0/dist/bin/js";
const HERMESC = process.env.HERMESC || "engines/hermes/build_release/bin/hermesc";
const HERMES = process.env.HERMES || "engines/hermes/build_release/bin/hermes";
const HBCDUMP = process.env.HBCDUMP || "engines/hermes/build_release/bin/hbcdump";

function runProc(cmd: string, args: string[], opts?: { stdin?: string; timeoutMs?: number }): Promise<RunResult> {
  const { stdin = "", timeoutMs = 15000 } = opts || {};
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
      resolve({ stdout: "", stderr: String(e), exitCode: -1, ms: Date.now() - t0 });
    });

    if (stdin) {
      p.stdin.write(stdin);
    }
    p.stdin.end();
  });
}

// ---- per-engine runners ----

async function runV8(tmpJs: string): Promise<RunResult> {
  // Всегда с --allow-natives-syntax и печатью байткода
  return runProc(V8_D8, ["--allow-natives-syntax", "--print-bytecode", tmpJs]);
}

async function runSpiderMonkey(tmpJs: string): Promise<RunResult> {
  // Загрузим файл и попробуем dis(f), если нет f — dis(this)
  const snippet = `load('${tmpJs
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")}'); try { print(dis(f)); } catch (e) { print(dis(this)); }`;
  return runProc(SM_JS, ["-e", snippet]);
}

async function runHermes(tmpJs: string, tmpDir: string): Promise<RunResult> {
  const hbc = path.join(tmpDir, "program.hbc");
  // 1) компиляция в .hbc
  const comp = await runProc(HERMESC, ["-emit-binary", "-out", hbc, tmpJs]);
  if (comp.exitCode !== 0) return comp;

  // 2) дизассембл с интерактивной командой "disassemble"
  // пишем в stdin hbcdump: "disassemble\n"
  return runProc(HBCDUMP, [hbc], { stdin: "disassemble\n" });
}

// ---- route handler ----

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code: string = body?.code ?? "";
    const engines: Engine[] = (body?.engines ?? ["v8", "sm", "hermes"]).filter((e: string) =>
      ["v8", "sm", "hermes"].includes(e)
    );

    if (!code || engines.length === 0) {
      return NextResponse.json({ ok: false, error: "code or engines missing" }, { status: 400 });
    }

    // temp workspace
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "js-bytecode-"));
    const tmpJs = path.join(tmpDir, "snippet.js");
    await fs.writeFile(tmpJs, code, "utf8");

    // run all in parallel
    const tasks: Record<Engine, Promise<RunResult>> = {
      v8: runV8(tmpJs),
      sm: runSpiderMonkey(tmpJs),
      hermes: runHermes(tmpJs, tmpDir),
    };

    const pending = engines.map((k) => tasks[k].then((r) => [k, r] as const));
    const settled = await Promise.all(pending);

    // cleanup (best-effort)
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}

    // pack results
    const results: Record<string, RunResult> = {};
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
