import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { forwardedHeaders, proxyToGateway, readJsonBody } from "@/lib/server/gateway";

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  return proxyToGateway("/api/run", {
    headers: forwardedHeaders(request),
    body: JSON.stringify(parsed.body),
  });
}

export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
