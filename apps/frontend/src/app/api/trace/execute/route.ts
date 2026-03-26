import { NextRequest, NextResponse } from "next/server";

const TRACE_SERVICE_URL = process.env.TRACE_SERVICE_URL ?? "http://localhost:8080";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(`${TRACE_SERVICE_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "trace-service unavailable";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
