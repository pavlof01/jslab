import { NextResponse } from "next/server";

function backendCandidates(): string[] {
  const configured = process.env.JSLAB_BACKEND_URL?.replace(/\/$/, "");

  const candidates = [configured, "http://localhost:8080", "http://api:8080"].filter(
    (value): value is string => Boolean(value)
  );

  return [...new Set(candidates)];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const errors: string[] = [];

    for (const backendUrl of backendCandidates()) {
      try {
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
        errors.push(`${backendUrl}: ${message}`);
      }
    }

    const message = `API proxy failed. Tried ${errors.join("; ")}`;
    console.error(message);
    return NextResponse.json({ error: message }, { status: 502 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.toLowerCase().includes("json")) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

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
