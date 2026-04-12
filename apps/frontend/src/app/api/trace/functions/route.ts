import { NextResponse } from "next/server";

const TRACE_SERVICE_URL = process.env.TRACE_SERVICE_URL ?? "http://localhost:8080";

export async function GET(): Promise<NextResponse> {
  let response: Response;
  try {
    response = await fetch(`${TRACE_SERVICE_URL}/functions`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "trace-service unavailable";
    return NextResponse.json({ error: `trace-service unavailable: ${message}` }, { status: 503 });
  }

  try {
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Invalid response from trace-service" }, { status: 502 });
  }
}
