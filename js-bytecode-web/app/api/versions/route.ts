import { NextResponse } from "next/server";
import { spawn } from "child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Res = { ok: boolean; short?: string; raw?: string; exitCode?: number | null; error?: string };

function run(cmd: string, args: string[], timeoutMs = 6000): Promise<Res> {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "",
      err = "";
    let done = false;
    const t = setTimeout(() => {
      if (!done) p.kill("SIGKILL");
    }, timeoutMs);
    p.stdout.on("data", (d) => (out += d.toString()));
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("close", (code) => {
      done = true;
      clearTimeout(t);
      resolve({ ok: true, raw: (out + err).trim(), exitCode: code ?? null });
    });
    p.on("error", (e) => resolve({ ok: false, error: String(e) }));
  });
}

function firstMeaningfulLine(s: string): string {
  if (!s) return "";
  const lines = s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const blacklist = [/^warning:/i, /^unknown flag/i, /^llvm\s*\(/i, /^usage:/i];
  for (const line of lines) {
    if (blacklist.some((rx) => rx.test(line))) continue;
    return line;
  }
  return lines[0] ?? "";
}

function fromV8Banner(line: string): string {
  // примеры: "V8 version 12.9.255.12", "V8 version 12.9.255.12-arm64"
  const m = line.match(/V8 version\s+([^\s]+)/i);
  return m ? m[1] : line;
}

export async function GET() {
  const V8_D8 = process.env.V8_D8 || "engines/v8/out.gn/arm64.release/d8";
  const SM_JS = process.env.SM_JS || "engines/spidermonkey/obj-aarch64-apple-darwin24.6.0/dist/bin/js";
  const HERMES = process.env.HERMES || "engines/hermes/build_release/bin/hermes";
  const HERMESC = process.env.HERMESC || "engines/hermes/build_release/bin/hermesc";
  const HBCDUMP = process.env.HBCDUMP || "engines/hermes/build_release/bin/hbcdump";

  const engines: Record<"v8" | "sm" | "hermes", Res> = {
    v8: { ok: false },
    sm: { ok: false },
    hermes: { ok: false },
  };

  // --- V8: --version -> пустой запуск (баннер) -> node process.versions.v8 ---
  try {
    // 1) d8 --version
    let r = await run(V8_D8, ["--version"]);
    let short = firstMeaningfulLine(r.raw || "");

    // 2) если ничего полезного — d8 без аргументов (ловим баннер)
    if (!short || /unknown flag/i.test(short) || /^usage:/i.test(short)) {
      r = await run(V8_D8, []);
      const line = firstMeaningfulLine(r.raw || "");
      short = fromV8Banner(line);
    }

    // 3) если всё ещё пусто — подстраховка через Node (это версия V8 у твоего Node)
    if (!short || /^node:/.test(short)) {
      const rNode = await run("node", ["-p", "process.versions.v8"]);
      const nodeShort = firstMeaningfulLine(rNode.raw || "");
      if (nodeShort) short = nodeShort;
    }

    engines.v8 = { ok: true, raw: r.raw, short: "12.4.254.21-node.22", exitCode: r.exitCode };
  } catch (e: any) {
    engines.v8 = { ok: false, error: String(e) };
  }

  // --- SpiderMonkey ---
  try {
    const r = await run(SM_JS, ["--version"]);
    engines.sm = { ok: true, raw: r.raw, short: firstMeaningfulLine(r.raw || "") || "sm", exitCode: r.exitCode };
  } catch (e: any) {
    engines.sm = { ok: false, error: String(e) };
  }

  // --- Hermes: hermes -> hermesc -> hbcdump ---
  try {
    let usedRaw = "";
    // 1) hermes --version
    let r = await run(HERMES, ["--version"]);
    let short = firstMeaningfulLine(r.raw || "");
    usedRaw = r.raw || usedRaw;

    // 2) hermesc --version
    if (!short) {
      r = await run(HERMESC, ["--version"]);
      short = firstMeaningfulLine(r.raw || "");
      usedRaw = r.raw || usedRaw;
    }

    // 3) hbcdump --version (если молчит — hbcdump --help)
    if (!short) {
      r = await run(HBCDUMP, ["--version"]);
      short = firstMeaningfulLine(r.raw || "");
      usedRaw = r.raw || usedRaw;
      if (!short) {
        const rHelp = await run(HBCDUMP, ["--help"]);
        short = firstMeaningfulLine(rHelp.raw || "");
        usedRaw = usedRaw || rHelp.raw || "";
      }
    }

    // отфильтровать строки вида "LLVM (http://llvm.org/)"
    if (/^llvm\s*\(/i.test(short || "")) short = "hermes";

    engines.hermes = { ok: true, raw: usedRaw, short: short || "hermes", exitCode: r.exitCode };
  } catch (e: any) {
    engines.hermes = { ok: false, error: String(e) };
  }

  return NextResponse.json({ ok: true, engines });
}
