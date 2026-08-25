import { NextResponse } from "next/server";

/**
 * The two failure modes every route handler that proxies a backend has to
 * answer for: the service could not be reached (503), and it answered with
 * something that is not the JSON it promised (502). Handlers used to spell both
 * out by hand, which is how they ended up wording the same failure differently.
 */

export const trimSlash = (url: string) => url.replace(/\/$/, "");

type Fetched = { response: Response } | { error: NextResponse };

/** GET an upstream, turning an unreachable service into a 503 response. */
export async function getUpstream(url: string, init?: RequestInit): Promise<Fetched> {
  try {
    return { response: await fetch(url, init) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "trace-service unavailable";
    return {
      error: NextResponse.json({ error: `trace-service unavailable: ${message}` }, { status: 503 }),
    };
  }
}

/** Pass an upstream's JSON through unchanged, or report it as unreadable. */
export async function jsonFromUpstream(response: Response): Promise<NextResponse> {
  try {
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ error: "Invalid response from trace-service" }, { status: 502 });
  }
}
