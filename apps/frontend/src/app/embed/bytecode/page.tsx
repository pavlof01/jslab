import type { Metadata } from "next";
import { headers } from "next/headers";

import FlagCatalogProvider from "@/components/FlagSelector/context";
import { buildEmbedOpenGraph, firstParam, type SearchParams } from "@/lib/embedMeta";
import {
  BYTECODE_EMBED_PATH,
  BYTECODE_EMBED_TITLE,
  decodeSnapshot,
  type EmbedSnapshot,
  OEMBED_PATH,
  SNAPSHOT_PARAM,
} from "@/lib/embedState";
import { fetchFlagCatalog } from "@/lib/server/flags";
import { decodeShareState, PLAYGROUND_EMBED_TITLE, SHARE_PARAM } from "@/lib/shareState";

import EmbedPlaygroundClient from "../playground/EmbedPlaygroundClient";
import EmbedBytecodeClient from "./EmbedBytecodeClient";

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "jslab.su";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

type Props = {
  searchParams: Promise<SearchParams>;
};

function isPlaygroundView(params: SearchParams): boolean {
  if (firstParam(params, SNAPSHOT_PARAM)) return false;
  const shared = firstParam(params, SHARE_PARAM);
  return Boolean(shared && decodeShareState(shared));
}

function embedUrl(origin: string, params: SearchParams): string {
  const snapshotParam = firstParam(params, SNAPSHOT_PARAM);
  const shareParam = isPlaygroundView(params) ? firstParam(params, SHARE_PARAM) : undefined;
  const key = snapshotParam ? SNAPSHOT_PARAM : SHARE_PARAM;
  const value = snapshotParam ?? shareParam;
  const query = value ? `?${key}=${encodeURIComponent(value)}` : "";
  return `${origin}${BYTECODE_EMBED_PATH}${query}`;
}

export const generateMetadata = async ({ searchParams }: Props): Promise<Metadata> => {
  const params = await searchParams;
  const snapshotParam = firstParam(params, SNAPSHOT_PARAM);
  const snapshot = snapshotParam ? await decodeSnapshot(snapshotParam) : null;
  const playground = isPlaygroundView(params);
  const shared = playground ? decodeShareState(firstParam(params, SHARE_PARAM) ?? "") : null;
  const title = playground
    ? PLAYGROUND_EMBED_TITLE
    : snapshot?.title?.trim() || BYTECODE_EMBED_TITLE;
  const origin = await requestOrigin();

  return {
    title,
    robots: { index: false, follow: false },
    alternates: { canonical: embedUrl(origin, params) },
    openGraph: buildEmbedOpenGraph(
      origin,
      title,
      embedUrl(origin, params),
      shared
        ? { subtitle: shared.code }
        : {
            subtitle: snapshot?.code,
            engine: snapshot?.engine,
            lines: snapshot ? snapshot.output.split("\n").length : undefined,
          },
    ),
  };
};

const EmbedBytecodePage = async ({ searchParams }: Props) => {
  const params = await searchParams;
  const snapshotParam = firstParam(params, SNAPSHOT_PARAM);
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
