import { NextResponse } from "next/server";

import { traceServiceEndpoint } from "@/lib/server/traceService";
import { getUpstream, jsonFromUpstream } from "@/lib/server/upstream";

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

  const fetched = await getUpstream(traceServiceEndpoint(`/spec/${name}`, `/api/spec/${name}`), {
    headers: { Accept: "text/html" },
  });
  if ("error" in fetched) return fetched.error;

  const { response } = fetched;
  if (!response.ok) return jsonFromUpstream(response);

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
