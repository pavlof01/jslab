import { NextRequest, NextResponse } from "next/server";

export interface ExecuteResponse {
  success: boolean;
  functionName: string;
  result?: { type: string; value?: unknown };
  root?: unknown;
  effectiveAlgoId?: string;
  detectedOperator?: string;
  error?: string;
}

// Traces go through the API gateway, never straight to trace-service: the
// gateway is where trace runs are rate limited, charged to an API key budget
// and counted in /metrics. In production Traefik routes /api/trace/execute to
// the gateway directly, so this handler only runs locally (`npm run dev`) or
// if that ingress rule is rolled back.
const GATEWAY_URL = process.env.JSLAB_BACKEND_URL?.replace(/\/$/, "") ?? "http://localhost:8080";

export async function POST(req: NextRequest): Promise<NextResponse<ExecuteResponse | { error: string }>> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
  }

  const { input } = body as Record<string, unknown>;

  if (typeof input !== "string" || input.trim().length === 0) {
    return NextResponse.json({ error: "input must be a non-empty string expression" }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(`${GATEWAY_URL}/api/trace/execute/equality`, {
      method: "POST",
      // Pass the caller's address on so the gateway meters per client instead of
      // per frontend pod; without it every visitor would share one rate bucket.
      headers: forwardedHeaders(req),
      body: JSON.stringify({ input }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "api gateway unavailable";
    console.error(`Failed to connect to the api gateway at ${GATEWAY_URL}:`, message);
    return NextResponse.json({ error: `api gateway unavailable: ${message}` }, { status: 503 });
  }

  try {
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Invalid response from the api gateway" }, { status: 502 });
  }
}

function forwardedHeaders(req: NextRequest): HeadersInit {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const apiKey = req.headers.get("x-api-key");

  return {
    "Content-Type": "application/json",
    ...(forwardedFor && { "x-forwarded-for": forwardedFor }),
    ...(apiKey && { "x-api-key": apiKey }),
  };
}
