import { NextRequest, NextResponse } from "next/server";

export interface ExecuteResponse {
  success: boolean;
  functionName: string;
  result?: { type: string; value?: unknown };
  root?: unknown;
  error?: string;
}

const TRACE_SERVICE_URL = process.env.TRACE_SERVICE_URL ?? "http://localhost:8080";

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

  const { functionName, input, preferredType } = body as Record<string, unknown>;

  if (!functionName || typeof functionName !== "string") {
    return NextResponse.json({ error: "functionName is required and must be a string" }, { status: 400 });
  }

  if (input === undefined) {
    return NextResponse.json({ error: "input is required" }, { status: 400 });
  }

  if (preferredType !== undefined && preferredType !== "string" && preferredType !== "number") {
    return NextResponse.json({ error: "preferredType must be 'string' or 'number'" }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(`${TRACE_SERVICE_URL}/execute/type-conversion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        functionName,
        input,
        ...(preferredType && { preferredType }),
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "trace-service unavailable";
    console.error(`Failed to connect to trace-service at ${TRACE_SERVICE_URL}:`, message);
    return NextResponse.json({ error: `trace-service unavailable: ${message}` }, { status: 503 });
  }

  try {
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Invalid response from trace-service" }, { status: 502 });
  }
}
