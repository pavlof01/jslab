import { NextRequest, NextResponse } from "next/server";

const TRACE_SERVICE_URL = process.env.TRACE_SERVICE_URL ?? "http://localhost:8080";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ functionName: string }> },
): Promise<NextResponse> {
  const { functionName } = await params;

  let response: Response;
  try {
    response = await fetch(`${TRACE_SERVICE_URL}/spec/${functionName}`, {
      headers: { Accept: "text/html" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "trace-service unavailable";
    return NextResponse.json({ error: `trace-service unavailable: ${message}` }, { status: 503 });
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    return NextResponse.json(body, { status: response.status });
  }

  const html = await response.text();
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
