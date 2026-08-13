import { EngineKey, isEngineKey } from "@/lib/types";

/**
 * State for a *frozen* embed: the engine output travels inside the URL, so the
 * embedded block renders without calling the API at all.
 *
 * This is deliberately a different shape and a different query param from
 * `shareState.ts`. That one carries only the inputs and is decoded
 * synchronously; this one carries the output too, which only fits after
 * compression — and compression in the browser is async, so the two cannot
 * share a decoder.
 *
 * Why frozen rather than re-running on load: an article outlives the engine
 * build it was written against. A live embed would silently change its bytecode
 * under the prose explaining it, and would break entirely whenever the API is
 * down or rate-limits the reader.
 */
export interface EmbedSnapshot {
  /** Source that produced the output; shown above it and used by "Open in JSLab". */
  code: string;
  engine: EngineKey;
  flags: string[];
  /** Captured stdout — the dump the embed renders. */
  output: string;
  /** Captured stderr, rendered under the dump when non-empty. */
  stderr?: string;
  /** Optional caption shown in the embed header and used as the oEmbed title. */
  title?: string;
}

/** Query param carrying a compressed snapshot. Distinct from shareState's `s`. */
export const SNAPSHOT_PARAM = "b";

/** Path of the output-only embed built for articles. */
export const BYTECODE_EMBED_PATH = "/embed/bytecode";

/**
 * oEmbed endpoint. Under `/embed`, NOT `/api`: the ingress routes `/api` to the
 * gateway service (priority 1000), so a frontend route handler there would
 * never be reached. `/embed` is a Prefix rule pointing at the frontend, so this
 * lands without touching infra — and inherits the permissive framing headers,
 * which is harmless for a JSON response.
 */
export const OEMBED_PATH = "/embed/oembed";

/** Defaults reported to oEmbed consumers when they ask for no particular size. */
export const EMBED_DEFAULT_WIDTH = 680;
export const EMBED_DEFAULT_HEIGHT = 420;

// Payload format: a one-character version marker, then base64url.
//   "1" → gzip-compressed JSON
//   "0" → plain JSON (fallback where CompressionStream is unavailable)
const VERSION_GZIP = "1";
const VERSION_PLAIN = "0";

function bytesToBase64Url(bytes: Uint8Array): string {
  // Chunked rather than String.fromCharCode(...bytes): spreading a multi-KB
  // array overflows the argument limit and throws.
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(param: string): Uint8Array {
  const b64 = param.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * gzip, not brotli: `CompressionStream` only implements gzip/deflate, and the
 * difference on a bytecode dump is around 20% — irrelevant next to the ~4x the
 * compression itself buys.
 */
function canCompress(): boolean {
  return typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
}

/**
 * Feed `bytes` through a (de)compression transform and collect the result.
 *
 * Built on ReadableStream alone — no Blob, no Response. Those are the two APIs
 * whose implementations differ most between the browser, Node and jsdom
 * (jsdom's Blob has no .stream()), and none of their conveniences are needed
 * for a single in-memory buffer.
 */
async function pipeThrough(
  bytes: Uint8Array,
  transform: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });

  // The DOM lib types the transform's writable side as BufferSource, which is
  // wider than the Uint8Array actually flowing through it. Runtime-compatible,
  // structurally not assignable — so the cast sits here, on the mismatch itself.
  const pair = transform as unknown as ReadableWritablePair<Uint8Array, Uint8Array>;
  const reader = source.pipeThrough(pair).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export async function encodeSnapshot(snapshot: EmbedSnapshot): Promise<string> {
  const compact = {
    c: snapshot.code,
    n: snapshot.engine,
    f: snapshot.flags,
    o: snapshot.output,
    ...(snapshot.stderr ? { r: snapshot.stderr } : {}),
    ...(snapshot.title ? { t: snapshot.title } : {}),
  };
  const json = JSON.stringify(compact);
  const bytes = new TextEncoder().encode(json);

  if (!canCompress()) return VERSION_PLAIN + bytesToBase64Url(bytes);

  const gzipped = await pipeThrough(bytes, new CompressionStream("gzip"));
  return VERSION_GZIP + bytesToBase64Url(gzipped);
}

export async function decodeSnapshot(param: string): Promise<EmbedSnapshot | null> {
  try {
    const version = param.slice(0, 1);
    const body = param.slice(1);
    if (version !== VERSION_GZIP && version !== VERSION_PLAIN) return null;

    let bytes = base64UrlToBytes(body);
    if (version === VERSION_GZIP) {
      if (!canCompress()) return null;
      bytes = await pipeThrough(bytes, new DecompressionStream("gzip"));
    }

    const raw = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    if (typeof raw.c !== "string" || typeof raw.o !== "string") return null;
    if (!isEngineKey(raw.n)) return null;

    return {
      code: raw.c,
      engine: raw.n,
      flags: Array.isArray(raw.f) ? raw.f.filter((x): x is string => typeof x === "string") : [],
      output: raw.o,
      stderr: typeof raw.r === "string" ? raw.r : undefined,
      title: typeof raw.t === "string" ? raw.t : undefined,
    };
  } catch {
    // A truncated or hand-edited param is a bad embed, not a crash.
    return null;
  }
}

/** Absolute URL of the frozen embed — this is what gets pasted into an article. */
export async function buildSnapshotUrl(origin: string, snapshot: EmbedSnapshot): Promise<string> {
  return `${origin}${BYTECODE_EMBED_PATH}?${SNAPSHOT_PARAM}=${await encodeSnapshot(snapshot)}`;
}

/**
 * Rough rendered height for a dump, used as the oEmbed `height`. Embedly (and
 * therefore Medium) fixes the iframe at whatever we report here — it cannot be
 * renegotiated from inside the frame — so this errs small and lets the embed
 * scroll internally rather than leaving a tall band of empty space.
 */
export function estimateEmbedHeight(output: string, opts: { min?: number; max?: number } = {}): number {
  const min = opts.min ?? 220;
  const max = opts.max ?? 520;
  const lines = output ? output.split("\n").length : 0;
  const LINE_HEIGHT = 19;
  const CHROME = 84; // header + padding
  return Math.min(max, Math.max(min, lines * LINE_HEIGHT + CHROME));
}
