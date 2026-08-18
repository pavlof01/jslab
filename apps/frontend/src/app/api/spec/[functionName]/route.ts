import { NextResponse } from "next/server";

import { traceServiceEndpoint } from "@/lib/server/traceService";

const OPERATION_NAME = /^[A-Za-z][A-Za-z0-9]*(?:(?:::|\.)[A-Za-z][A-Za-z0-9]*)*$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ functionName: string }> },
): Promise<NextResponse> {
  const { functionName } = await params;

  if (!OPERATION_NAME.test(functionName)) {
    return NextResponse.json({ error: "Not a valid abstract operation name" }, { status: 400 });
  }

  const name = encodeURIComponent(functionName);

  let response: Response;
  try {
    response = await fetch(traceServiceEndpoint(`/spec/${name}`, `/api/spec/${name}`), {
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
      "X-Content-Type-Options": "nosniff",
    },
  });
}
