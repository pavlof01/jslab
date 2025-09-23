// app/api/versions/route.ts
import { NextResponse } from "next/server";
import { spawn } from "child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Engine = "v8" | "sm" | "hermes" | "jsc";
type VersionInfo = { ok: boolean; short?: string; raw?: string; exitCode?: number | null; error?: string };

const V8_D8 = process.env.V8_D8 || "engines/v8/out.gn/arm64.release/d8";
const SM_JS = process.env.SM_JS || "engines/spidermonkey/obj-aarch64-apple-darwin24.6.0/dist/bin/js";
const HERMESC = process.env.HERMESC || "engines/hermes/build_release/bin/hermesc";
const JSC_BIN = process.env.JSC || "engines/WebKit/WebKitBuild/Debug/jsc";

function quick(
  cmd: string,
  args: string[],
  timeoutMs = 5000
): Promise<{ out: string; err: string; code: number | null }> {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "",
      err = "";
    const killer = setTimeout(() => p.kill("SIGKILL"), timeoutMs);
    p.stdout.on("data", (d) => (out += d.toString()));
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("close", (code) => {
      clearTimeout(killer);
      resolve({ out, err, code });
    });
    p.on("error", (e) => {
      clearTimeout(killer);
      resolve({ out: "", err: String(e), code: -1 });
    });
  });
}

function pack(ok: boolean, raw: string, code: number | null, error?: string, shortFallback?: string): VersionInfo {
  const first = (raw || "").split(/\r?\n/)[0]?.trim();
  return ok
    ? { ok: true, raw, short: first || shortFallback || "ok", exitCode: code }
    : { ok: false, raw, error: error || first || "unavailable", exitCode: code };
}

export async function GET() {
  const v8 = pack(true, "V8 12.4.254.21-node.22", 0); // захардкожено, как обсуждали

  const smProbe = await quick(SM_JS, ["--version"]);
  const sm =
    smProbe.code === 0
      ? pack(true, smProbe.out || smProbe.err, smProbe.code)
      : pack(false, smProbe.out || "", smProbe.code, smProbe.err);

  const hermesProbe = await quick(HERMESC, ["--version"]);
  const hermes =
    hermesProbe.code === 0
      ? pack(true, hermesProbe.out || hermesProbe.err, hermesProbe.code)
      : pack(false, hermesProbe.out || "", hermesProbe.code, hermesProbe.err);

  const jscProbe = await quick(JSC_BIN, ["--version"]);
  const jsc =
    jscProbe.code === 0
      ? pack(true, jscProbe.out || jscProbe.err, jscProbe.code)
      : pack(false, jscProbe.out || "", jscProbe.code, jscProbe.err, "jsc");

  const engines: Record<Engine, VersionInfo> = { v8, sm, hermes, jsc };
  return NextResponse.json({ ok: true, engines });
}
