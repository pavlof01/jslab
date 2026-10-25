import { gzipSync } from "node:zlib";

/**
 * A hand-rolled encoder for the `?b=` snapshot, because e2e cannot import from
 * the frontend workspace. It mirrors `encodeSnapshot` in
 * `apps/frontend/src/lib/embedState.ts` — the version prefix, the compact key
 * names and base64url — so the two must change together. The param is a public
 * contract (Embedly resolves these URLs), so a silent drift here would hide a
 * real break: the specs only pass while the app can decode what this builds.
 */
export const BYTECODE_EMBED_PATH = "/embed/bytecode";
export const SNAPSHOT_PARAM = "b";

/** `VERSION_GZIP` in embedState.ts. */
const VERSION_GZIP = "1";

export type EmbedSnapshot = {
  code: string;
  engine: string;
  flags?: string[];
  output: string;
  stderr?: string;
  title?: string;
};

const toBase64Url = (bytes: Buffer): string =>
  bytes.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function bytecodeEmbedUrl(snapshot: EmbedSnapshot): string {
  const compact = {
    c: snapshot.code,
    n: snapshot.engine,
    f: snapshot.flags ?? [],
    o: snapshot.output,
    ...(snapshot.stderr ? { r: snapshot.stderr } : {}),
    ...(snapshot.title ? { t: snapshot.title } : {}),
  };
  const payload = toBase64Url(gzipSync(Buffer.from(JSON.stringify(compact), "utf8")));
  return `${BYTECODE_EMBED_PATH}?${SNAPSHOT_PARAM}=${VERSION_GZIP}${payload}`;
}
