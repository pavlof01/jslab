import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 256 * 1024;
const UPSTREAM_TIMEOUT_MS = 10_000;

function res(status: number, body: string) {
  return new NextResponse(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function readBodyWithLimit(req: Request): Promise<{ ok: true; text: string } | { ok: false; status: 413 }> {
  const stream = req.body;
  if (!stream) return { ok: true, text: "" };

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      try {
        await reader.cancel();
      } catch {}
      return { ok: false, status: 413 };
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }

  return { ok: true, text: new TextDecoder().decode(merged) };
}

async function proxy(req: Request) {
  const upstreamUrl = process.env.JSLAB_BACKEND_URL;
  const apiKey = process.env.JSLAB_API_KEY;

  // Не палим названия/значения env
  if (!upstreamUrl) return res(500, "Internal Server Error");

  // Только POST
  if (req.method !== "POST") return res(405, "Method Not Allowed");

  // Читаем body с лимитом
  const body = await readBodyWithLimit(req);
  if (!body.ok) return res(413, "Payload Too Large");

  // Проверяем, что это JSON (но не парсим в объект!)
  // Если хочешь принимать пустое тело — оставь как есть; иначе заставь быть JSON.
  if (body.text) {
    try {
      JSON.parse(body.text);
    } catch {
      return res(400, "Invalid JSON");
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let upstreamResp: Response;
  try {
    upstreamResp = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: body.text || "{}", // чтобы upstream не упал, если ожидает json
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") return res(504, "Gateway Timeout");
    return res(502, "Bad Gateway");
  } finally {
    clearTimeout(timeoutId);
  }

  // Только безопасные headers обратно клиенту
  const headers = new Headers();
  headers.set("Cache-Control", "no-store");

  const ct = upstreamResp.headers.get("content-type");
  if (ct) headers.set("content-type", ct);

  // Важно: не прокидываем set-cookie и прочее
  return new NextResponse(upstreamResp.body, {
    status: upstreamResp.status,
    headers,
  });
}

export async function POST(req: Request) {
  return proxy(req);
}

// На всякий случай явно 405 для остальных
export function GET() {
  return res(405, "Method Not Allowed");
}
export function PUT() {
  return res(405, "Method Not Allowed");
}
export function PATCH() {
  return res(405, "Method Not Allowed");
}
export function DELETE() {
  return res(405, "Method Not Allowed");
}
export function OPTIONS() {
  return res(405, "Method Not Allowed");
}
