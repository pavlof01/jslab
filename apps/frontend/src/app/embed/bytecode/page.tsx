import type { Metadata } from "next";
import { headers } from "next/headers";

import {
  BYTECODE_EMBED_PATH,
  BYTECODE_EMBED_TITLE,
  decodeSnapshot,
  type EmbedSnapshot,
  OEMBED_PATH,
  SNAPSHOT_PARAM,
} from "@/lib/embedState";
import { OG_CARD, ogCardUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

import EmbedBytecodeClient from "./EmbedBytecodeClient";

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "jslab.su";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

type SearchParams = Record<string, string | string[] | undefined>;

type Props = {
  searchParams: Promise<SearchParams>;
};

function readSnapshotParam(params: SearchParams): string | undefined {
  const raw = params[SNAPSHOT_PARAM];
  return Array.isArray(raw) ? raw[0] : raw;
}

function embedUrl(origin: string, snapshotParam: string | undefined): string {
  const query = snapshotParam ? `?${SNAPSHOT_PARAM}=${encodeURIComponent(snapshotParam)}` : "";
  return `${origin}${BYTECODE_EMBED_PATH}${query}`;
}

export const generateMetadata = async ({ searchParams }: Props): Promise<Metadata> => {
  const snapshotParam = readSnapshotParam(await searchParams);
  const snapshot = snapshotParam ? await decodeSnapshot(snapshotParam) : null;
  const title = snapshot?.title?.trim() || BYTECODE_EMBED_TITLE;
  const origin = await requestOrigin();

  return {
    title,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description: SITE_DESCRIPTION,
      url: embedUrl(origin, snapshotParam),
      siteName: SITE_NAME,
      type: "article",
      locale: "en_US",
      images: [
        {
          url: ogCardUrl(origin, {
            title,
            subtitle: snapshot?.code,
            engine: snapshot?.engine,
            lines: snapshot ? snapshot.output.split("\n").length : undefined,
          }),
          width: OG_CARD.width,
          height: OG_CARD.height,
          alt: title,
        },
      ],
    },
  };
};

const EmbedBytecodePage = async ({ searchParams }: Props) => {
  const snapshotParam = readSnapshotParam(await searchParams);

  let snapshot: EmbedSnapshot | null = null;
  if (snapshotParam) snapshot = await decodeSnapshot(snapshotParam);

  const origin = await requestOrigin();
  const selfUrl = embedUrl(origin, snapshotParam);
  const discoveryHref = `${origin}${OEMBED_PATH}?format=json&url=${encodeURIComponent(selfUrl)}`;

  return (
    <>
      <link
        rel="alternate"
        type="application/json+oembed"
        href={discoveryHref}
        title={BYTECODE_EMBED_TITLE}
      />
      <EmbedBytecodeClient snapshot={snapshot} />
    </>
  );
};

export default EmbedBytecodePage;
