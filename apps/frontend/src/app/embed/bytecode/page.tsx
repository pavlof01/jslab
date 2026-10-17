import type { Metadata } from "next";
import { headers } from "next/headers";

import FlagCatalogProvider from "@/components/FlagSelector/context";
import {
  BYTECODE_EMBED_PATH,
  BYTECODE_EMBED_TITLE,
  decodeSnapshot,
  EMBED_THUMBNAIL,
  type EmbedSnapshot,
  OEMBED_PATH,
  SNAPSHOT_PARAM,
} from "@/lib/embedState";
import { fetchFlagCatalog } from "@/lib/server/flags";
import { PLAYGROUND_EMBED_TITLE, SHARE_PARAM } from "@/lib/shareState";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

import EmbedPlaygroundClient from "../playground/EmbedPlaygroundClient";
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

function readShareParam(params: SearchParams): string | undefined {
  const raw = params[SHARE_PARAM];
  return Array.isArray(raw) ? raw[0] : raw;
}

/** The registered scheme also serves the interactive playground, selected by `s` alone. */
function isPlaygroundView(params: SearchParams): boolean {
  return !readSnapshotParam(params) && Boolean(readShareParam(params));
}

function embedUrl(origin: string, params: SearchParams): string {
  const snapshotParam = readSnapshotParam(params);
  const shareParam = isPlaygroundView(params) ? readShareParam(params) : undefined;
  const query = snapshotParam
    ? `?${SNAPSHOT_PARAM}=${encodeURIComponent(snapshotParam)}`
    : shareParam
      ? `?${SHARE_PARAM}=${encodeURIComponent(shareParam)}`
      : "";
  return `${origin}${BYTECODE_EMBED_PATH}${query}`;
}

export const generateMetadata = async ({ searchParams }: Props): Promise<Metadata> => {
  const params = await searchParams;
  const snapshotParam = readSnapshotParam(params);
  const snapshot = snapshotParam ? await decodeSnapshot(snapshotParam) : null;
  const title = isPlaygroundView(params)
    ? PLAYGROUND_EMBED_TITLE
    : snapshot?.title?.trim() || BYTECODE_EMBED_TITLE;
  const origin = await requestOrigin();

  return {
    title,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description: SITE_DESCRIPTION,
      url: embedUrl(origin, params),
      siteName: SITE_NAME,
      type: "article",
      locale: "en_US",
      images: [
        {
          url: `${origin}${EMBED_THUMBNAIL.path}`,
          width: EMBED_THUMBNAIL.width,
          height: EMBED_THUMBNAIL.height,
          alt: title,
        },
      ],
    },
  };
};

const EmbedBytecodePage = async ({ searchParams }: Props) => {
  const params = await searchParams;
  const snapshotParam = readSnapshotParam(params);
  const playground = isPlaygroundView(params);

  let snapshot: EmbedSnapshot | null = null;
  if (snapshotParam) snapshot = await decodeSnapshot(snapshotParam);

  const origin = await requestOrigin();
  const selfUrl = embedUrl(origin, params);
  const catalog = playground ? await fetchFlagCatalog() : null;
  const discoveryHref = `${origin}${OEMBED_PATH}?format=json&url=${encodeURIComponent(selfUrl)}`;

  return (
    <>
      <link
        rel="alternate"
        type="application/json+oembed"
        href={discoveryHref}
        title={playground ? PLAYGROUND_EMBED_TITLE : BYTECODE_EMBED_TITLE}
      />
      {catalog ? (
        <FlagCatalogProvider catalog={catalog}>
          <EmbedPlaygroundClient />
        </FlagCatalogProvider>
      ) : (
        <EmbedBytecodeClient snapshot={snapshot} />
      )}
    </>
  );
};

export default EmbedBytecodePage;
