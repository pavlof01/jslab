import type { OpenGraph } from "next/dist/lib/metadata/types/opengraph-types";

import { EMBED_THUMBNAIL } from "@/lib/embedState";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export type SearchParams = Record<string, string | string[] | undefined>;

export function firstParam(params: SearchParams, key: string): string | undefined {
  const raw = params[key];
  return Array.isArray(raw) ? raw[0] : raw;
}

export function buildEmbedOpenGraph(origin: string, title: string, url: string): OpenGraph {
  return {
    title,
    description: SITE_DESCRIPTION,
    url,
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
  };
}
