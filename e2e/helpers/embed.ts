import { gzipSync } from "node:zlib";

export const BYTECODE_EMBED_PATH = "/embed/bytecode";
export const SNAPSHOT_PARAM = "b";

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
  return `${BYTECODE_EMBED_PATH}?${SNAPSHOT_PARAM}=1${payload}`;
}
