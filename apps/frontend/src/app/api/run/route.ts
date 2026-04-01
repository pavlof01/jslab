import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Determine backend URL based on environment
    // In dev: API service on localhost:8080 (port-forward)
    // In k8s: API service via internal DNS at http://api:8080
    const backendUrl = process.env.JSLAB_BACKEND_URL || "http://api:8080";

    const body = await request.json();

    const response = await fetch(`${backendUrl}/api/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("API proxy error:", message);
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}

export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
