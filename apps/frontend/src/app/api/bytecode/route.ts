import { NextResponse } from "next/server";
import { ENGINE_KEYS, EngineKey, isEngineKey } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 256 * 1024;
const MAX_CODE_CHARS = 240 * 1024; // небольшой запас под JSON-обвязку
const UPSTREAM_TIMEOUT_MS = 10_000;

type RunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  ms: number;
  status?: number; // upstream http status (optional)
};

const SUPPORTED_ENGINES = [EngineKey.v8, EngineKey.hermes, EngineKey.sm, EngineKey.jsc] as const;
type SupportedEngine = (typeof SUPPORTED_ENGINES)[number];

function isSupportedEngine(engine: EngineKey): engine is SupportedEngine {
  return engine === EngineKey.v8 || engine === EngineKey.hermes || engine === EngineKey.sm || engine === EngineKey.jsc;
}

// лучше whitelist, чем "любые --*"
const V8_FLAG_WHITELIST = new Set<string>([
  "--print-bytecode",
  "--print-bytecode-filter",
  "--no-lazy",
  "--no-flush-bytecode",
  "--trace-ignition",
  "--trace-ignition-dispatches",
  "--trace-ignition-codegen",
  "--trace-ignition-interpreter",
  "--trace-serializer",
]);

function sanitizeV8Flags(value: unknown): string[] {
  const incoming = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const raw of incoming) {
    if (typeof raw !== "string") continue;

    const trimmed = raw.trim();
    if (!trimmed.startsWith("--")) continue;
    if (trimmed.length > 200) continue;
    if (seen.has(trimmed)) continue;

    // allow exact flag OR flag with "=value" if base is whitelisted
    const [base] = trimmed.split("=", 1);
    if (!V8_FLAG_WHITELIST.has(base)) continue;

    seen.add(trimmed);
    cleaned.push(trimmed);

    if (cleaned.length >= 25) break; // лимит количества флагов
  }

  return cleaned;
}

async function readBodyLimited(req: Request): Promise<string | { status: number }> {
  const len = req.headers.get("content-length");
  if (len) {
    const n = Number(len);
    if (Number.isFinite(n) && n > MAX_BODY_BYTES) return { status: 413 };
  }

  // fallback на потоковый лимит, если content-length нет/врет
  const reader = req.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (value) {
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        reader.cancel().catch(() => {});
        return { status: 413 };
      }
      chunks.push(value);
    }
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(merged);
}

async function callEngine(upstream: string, apiKey: string, payload: any, signal: AbortSignal): Promise<RunResult> {
  const res = await fetch(upstream, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(payload),
    signal,
  });

  const text = await res.text();

  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  // если upstream вернул не-2xx
  if (!res.ok) {
    return {
      stdout: parsed?.stdout ?? "",
      stderr: parsed?.error ?? parsed?.stderr ?? (text || `upstream http ${res.status}`),
      exitCode: parsed?.exitCode ?? null,
      ms: parsed?.meta?.durationMs ?? 0,
      status: res.status,
    };
  }

  // если 2xx, но формат странный
  if (!parsed || typeof parsed !== "object") {
    return { stdout: "", stderr: text || "invalid upstream response", exitCode: null, ms: 0, status: res.status };
  }

  if (!parsed.ok) {
    return {
      stdout: parsed.stdout || "",
      stderr: parsed.error || parsed.stderr || "upstream error",
      exitCode: parsed.exitCode ?? null,
      ms: parsed.meta?.durationMs ?? 0,
      status: res.status,
    };
  }

  return {
    stdout: parsed.stdout || "",
    stderr: parsed.stderr || "",
    exitCode: parsed.exitCode ?? null,
    ms: parsed.meta?.durationMs ?? 0,
    status: res.status,
  };
}

export async function POST(req: Request) {
  const upstream = process.env.JSLAB_BACKEND_URL;
  const apiKey = process.env.JSLAB_API_KEY;

  if (!upstream || !apiKey) {
    return NextResponse.json({ ok: false, error: "upstream not configured" }, { status: 500 });
  }

  const bodyStr = await readBodyLimited(req);
  if (typeof bodyStr === "object") {
    return NextResponse.json({ ok: false, error: "payload too large" }, { status: 413 });
  }

  let body: any;
  try {
    body = bodyStr ? JSON.parse(bodyStr) : {};
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const code: string = body?.code ?? "";
  if (!code || typeof code !== "string") {
    return NextResponse.json({ ok: false, error: "code missing" }, { status: 400 });
  }
  if (code.length > MAX_CODE_CHARS) {
    return NextResponse.json({ ok: false, error: "code too large" }, { status: 413 });
  }

  const enginesReq: unknown = body?.engines ?? ENGINE_KEYS;
  const requestedEngines = Array.isArray(enginesReq) ? enginesReq : ENGINE_KEYS;

  const engines = requestedEngines
    .map((v) => (typeof v === "string" ? v : null))
    .filter((v): v is EngineKey => (v ? isEngineKey(v) : false))
    .filter(isSupportedEngine);

  if (engines.length === 0) {
    return NextResponse.json({ ok: false, error: "engines missing" }, { status: 400 });
  }

  const v8Flags = sanitizeV8Flags(body?.v8Flags);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const tasks = engines.map(async (engine) => {
      const payload = {
        engine,
        task: "bytecode",
        sourceText: code,
        options: engine === EngineKey.v8 ? { flags: v8Flags } : {},
      };

      const result = await callEngine(upstream, apiKey, payload, controller.signal);
      return [engine, result] as const;
    });

    const settled = await Promise.all(tasks);

    const results = Object.create(null) as Record<SupportedEngine, RunResult>;
    let totalMs = 0;

    for (const [engine, res] of settled) {
      results[engine] = res;
      totalMs = Math.max(totalMs, res.ms);
    }

    return NextResponse.json({ ok: true, meta: { ms: totalMs }, results });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return NextResponse.json({ ok: false, error: "upstream timeout" }, { status: 504 });
    }
    return NextResponse.json({ ok: false, error: "upstream error" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
