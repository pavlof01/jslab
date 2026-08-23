import { request } from "undici";

/**
 * The gateway's one way of talking to a backend service.
 *
 * Both upstreams (the engine pods and trace-service) need the same five things:
 * a joined URL, a JSON POST, a bounded read of the response body, a network
 * error classified into something loggable, and the raw text left for the
 * caller to interpret. Two copies of that drifted in the details that matter
 * least and are hardest to notice — which timeout applies, whether the body is
 * capped — so it lives here once.
 */

export type UpstreamHeaders = Record<string, string | string[] | undefined>;

export type UpstreamResult =
  | { ok: true; status: number; headers: UpstreamHeaders; text: string }
  | { ok: false; kind: string; message: string; error: unknown };

/**
 * Largest upstream body the gateway will read into memory. An engine already
 * caps its own output, but this is the gateway's own guard against a
 * misbehaving or compromised upstream streaming without end.
 */
export const MAX_UPSTREAM_RESPONSE_BYTES = 4 * 1024 * 1024;

export function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}${path}`;
}

export function classifyUpstreamError(serviceName: string, err: unknown): { kind: string; message: string } {
  const code = (err as { code?: string } | null)?.code;
  switch (code) {
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return { kind: "dns", message: `${serviceName} DNS lookup failed` };
    case "ECONNREFUSED":
      return { kind: "connect_refused", message: `${serviceName} connection refused` };
    case "UND_ERR_CONNECT_TIMEOUT":
    case "ETIMEDOUT":
      return { kind: "connect_timeout", message: `${serviceName} connect timeout` };
    case undefined:
      if ((err as { name?: string } | null)?.name === "TimeoutError") {
        return { kind: "timeout", message: `${serviceName} timed out` };
      }
      return { kind: "request_error", message: `${serviceName} request failed` };
    case "UND_ERR_HEADERS_TIMEOUT":
      return { kind: "headers_timeout", message: `${serviceName} headers timeout` };
    case "UND_ERR_BODY_TIMEOUT":
      return { kind: "body_timeout", message: `${serviceName} body timeout` };
    case "UPSTREAM_RESPONSE_TOO_LARGE":
      return { kind: "response_too_large", message: `${serviceName} response too large` };
    default:
      return { kind: "request_error", message: `${serviceName} request failed` };
  }
}

async function readResponseText(
  body: AsyncIterable<Buffer | string>,
  maxBytes = MAX_UPSTREAM_RESPONSE_BYTES,
): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of body) {
    const buf = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
    total += buf.length;
    if (total > maxBytes) {
      const err = new Error(`upstream response exceeds ${maxBytes} bytes`) as Error & { code: string };
      err.code = "UPSTREAM_RESPONSE_TOO_LARGE";
      throw err;
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function requestUpstream(
  serviceName: string,
  url: string,
  timeoutMs: number,
  init: { method: "GET" | "POST"; body?: string; headers?: Record<string, string> },
): Promise<UpstreamResult> {
  try {
    const res = await request(url, {
      method: init.method,
      body: init.body,
      headers: init.headers,
      bodyTimeout: timeoutMs,
      headersTimeout: timeoutMs,
      signal: AbortSignal.timeout(timeoutMs),
    });
    return {
      ok: true,
      status: res.statusCode,
      headers: res.headers as UpstreamHeaders,
      text: await readResponseText(res.body),
    };
  } catch (error) {
    return { ok: false, ...classifyUpstreamError(serviceName, error), error };
  }
}

export function postJson(
  serviceName: string,
  url: string,
  body: unknown,
  timeoutMs: number,
): Promise<UpstreamResult> {
  return requestUpstream(serviceName, url, timeoutMs, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

export function getJson(serviceName: string, url: string, timeoutMs: number): Promise<UpstreamResult> {
  return requestUpstream(serviceName, url, timeoutMs, { method: "GET" });
}

/** Parse an upstream body, or `undefined` when it is not JSON at all. */
export function parseJson<T>(text: string): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}
