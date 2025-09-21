// app/api/bytecode/route.ts
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";
import { glob } from "glob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Engine = "v8" | "sm" | "hermes";
type RunResult = { stdout: string; stderr: string; exitCode: number | null; ms: number };

// ------------------- candidate paths -------------------

const V8_CANDIDATES = [
  process.env.V8_D8,
  "engines/v8/out.gn/x64.debug/d8",
  "engines/v8/out.gn/arm64.debug/d8",
  "engines/v8/out.gn/x64.release/d8",
  "engines/v8/out.gn/arm64.release/d8",
].filter(Boolean) as string[];

const SM_CANDIDATES = [
  process.env.SM_JS,
  "engines/spidermonkey/bin/js",
  "engines/spidermonkey/obj-*/dist/bin/js",
  "engines/sm/obj-*/dist/bin/js",
  "engines/sm/dist/bin/js",
].filter(Boolean) as string[];

const HERMESC_CANDIDATES = [process.env.HERMESC, "engines/hermes/build_release/bin/hermesc"].filter(
  Boolean
) as string[];

const HERMES_CANDIDATES = [process.env.HERMES, "engines/hermes/build_release/bin/hermes"].filter(Boolean) as string[];

const HBCDUMP_CANDIDATES = [process.env.HBCDUMP, "engines/hermes/build_release/bin/hbcdump"].filter(
  Boolean
) as string[];

// ------------------- helpers -------------------

async function firstExecutable(paths: string[]): Promise<string | null> {
  for (const pattern of paths) {
    const matches = pattern.includes("*") ? await glob(pattern) : [pattern];
    for (const p of matches) {
      try {
        await fs.access(p, fsSync.constants.X_OK);
        return p;
      } catch {}
    }
  }
  return null;
}

async function resolveCmd(name: string, candidates: string[]): Promise<string> {
  const p = await firstExecutable(candidates);
  if (p) return p;
  throw new Error(
    `${name} not found. Tried:\n${candidates.map((c) => "  - " + c).join("\n")}\n` +
      `Tip: set ${name} via ENV (e.g. ${name}=/abs/path/to/bin)`
  );
}

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

    if (stdin) p.stdin.write(stdin);
    p.stdin.end();
  });
}

// ------------------- per-engine runners -------------------

async function runV8(tmpJs: string): Promise<RunResult> {
  const d8 = await resolveCmd("V8_D8", V8_CANDIDATES);
  return runProc(d8, ["--allow-natives-syntax", "--print-bytecode", tmpJs]);
}

async function runSpiderMonkey(tmpJs: string): Promise<RunResult> {
  const js = await resolveCmd("SM_JS", SM_CANDIDATES);
  const snippet =
    `load('${tmpJs.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}');` +
    `try{ print(dis(f)); }catch(e){ print(dis(this)); }`;
  return runProc(js, ["-e", snippet]);
}

async function runHermes(tmpJs: string, tmpDir: string): Promise<RunResult> {
  const hermesc = await resolveCmd("HERMESC", HERMESC_CANDIDATES);
  const hbcdump = await resolveCmd("HBCDUMP", HBCDUMP_CANDIDATES);
  const hbc = path.join(tmpDir, "program.hbc");

  const comp = await runProc(hermesc, ["-emit-binary", "-out", hbc, tmpJs]);
  if (comp.exitCode !== 0) return comp;

  return runProc(hbcdump, [hbc], { stdin: "disassemble\n" });
}

// ------------------- route handler -------------------

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

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "js-bytecode-"));
    const tmpJs = path.join(tmpDir, "snippet.js");
    await fs.writeFile(tmpJs, code, "utf8");

    const tasks: Record<Engine, Promise<RunResult>> = {
      v8: runV8(tmpJs),
      sm: runSpiderMonkey(tmpJs),
      hermes: runHermes(tmpJs, tmpDir),
    };

    const settled = await Promise.all(engines.map((k) => tasks[k].then((r) => [k, r] as const)));

    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}

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
