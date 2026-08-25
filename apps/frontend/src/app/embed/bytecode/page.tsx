import type { Metadata } from "next";
import { headers } from "next/headers";

import {
  BYTECODE_EMBED_PATH,
  decodeSnapshot,
  type EmbedSnapshot,
  OEMBED_PATH,
  SNAPSHOT_PARAM,
} from "@/lib/embedState";

import EmbedBytecodeClient from "./EmbedBytecodeClient";

export const metadata: Metadata = {
  title: "JSLab bytecode",
  robots: { index: false, follow: false },
};

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "jslab.su";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const EmbedBytecodePage = async ({ searchParams }: Props) => {
  const params = await searchParams;
  const raw = params[SNAPSHOT_PARAM];
  const snapshotParam = Array.isArray(raw) ? raw[0] : raw;

  let snapshot: EmbedSnapshot | null = null;
  if (snapshotParam) snapshot = await decodeSnapshot(snapshotParam);

  const origin = await requestOrigin();
  const selfUrl = `${origin}${BYTECODE_EMBED_PATH}${snapshotParam ? `?${SNAPSHOT_PARAM}=${encodeURIComponent(snapshotParam)}` : ""}`;
  const discoveryHref = `${origin}${OEMBED_PATH}?format=json&url=${encodeURIComponent(selfUrl)}`;

  return (
    <>
      <link
        rel="alternate"
        type="application/json+oembed"
        href={discoveryHref}
        title="JSLab bytecode"
      />
      <EmbedBytecodeClient snapshot={snapshot} />
    </>
  );
};

export default EmbedBytecodePage;
