import { base64UrlToBytes, bytesToBase64Url } from "@/lib/base64url";
import { EngineKey, isEngineKey } from "@/lib/types";

export interface EmbedSnapshot {
  /** Source that produced the output; shown above it and used by "Open in JSLab". */
  code: string;
  engine: EngineKey;
  flags: string[];
  output: string;
  /** Captured stderr, rendered under the dump when non-empty. */
  stderr?: string;
  /** Optional caption shown in the embed header and used as the oEmbed title. */
  title?: string;
}

/** Query param carrying a compressed snapshot. Distinct from shareState's `s`. */
export const SNAPSHOT_PARAM = "b";

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

const VERSION_GZIP = "1";
const VERSION_PLAIN = "0";

function canCompress(): boolean {
  return typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
}

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
    return null;
  }
}

export async function buildSnapshotUrl(origin: string, snapshot: EmbedSnapshot): Promise<string> {
  return `${origin}${BYTECODE_EMBED_PATH}?${SNAPSHOT_PARAM}=${await encodeSnapshot(snapshot)}`;
}

export function estimateEmbedHeight(output: string, opts: { min?: number; max?: number } = {}): number {
  const min = opts.min ?? 220;
  const max = opts.max ?? 520;
  const lines = output ? output.split("\n").length : 0;
  const LINE_HEIGHT = 19;
  const FRAME = 84; // header + padding
  return Math.min(max, Math.max(min, lines * LINE_HEIGHT + FRAME));
}
