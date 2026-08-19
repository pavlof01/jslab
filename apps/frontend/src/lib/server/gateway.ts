import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { trimSlash } from "@/lib/server/upstream";

const DEV_FALLBACK = "http://localhost:8080";

export function gatewayUrl(kind: "run" | "trace" = "run"): string {
  const configured = kind === "trace" ? process.env.JSLAB_TRACE_BACKEND_URL ?? process.env.JSLAB_BACKEND_URL : process.env.JSLAB_BACKEND_URL;
  return configured ? trimSlash(configured) : DEV_FALLBACK;
}

export function forwardedHeaders(req: NextRequest | Request): HeadersInit {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("cf-connecting-ip");
  const apiKey = req.headers.get("x-api-key");

  return {
    "content-type": "application/json",
    ...(forwardedFor && { "x-forwarded-for": forwardedFor }),
    ...(realIp && { "cf-connecting-ip": realIp }),
    ...(apiKey && { "x-api-key": apiKey }),
  };
}

export const PROXY_TIMEOUT_MS = 15_000;

export async function readJsonBody(req: NextRequest | Request): Promise<{ body: unknown } | { error: NextResponse }> {
  try {
    return { body: await req.json() };
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }
}

export async function proxyToGateway(
  path: string,
  init: { headers: HeadersInit; body: string; timeoutMs?: number; kind?: "run" | "trace" },
): Promise<NextResponse> {
  const base = gatewayUrl(init.kind ?? "run");

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: init.headers,
      body: init.body,
      signal: AbortSignal.timeout(init.timeoutMs ?? PROXY_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(`Gateway request to ${base}${path} failed:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "The engine service is unavailable. Try again in a moment." }, { status: 503 });
  }

  try {
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ error: "The engine service returned an unreadable response." }, { status: 502 });
  }
}
