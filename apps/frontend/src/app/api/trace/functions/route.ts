import type { NextResponse } from "next/server";

import { traceServiceEndpoint } from "@/lib/server/traceService";
import { getUpstream, jsonFromUpstream } from "@/lib/server/upstream";

export async function GET(): Promise<NextResponse> {
  const fetched = await getUpstream(traceServiceEndpoint("/functions", "/api/trace/functions"));
  if ("error" in fetched) return fetched.error;

  return jsonFromUpstream(fetched.response);
}
