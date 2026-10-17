import type { OpenGraph } from "next/dist/lib/metadata/types/opengraph-types";

import { OG_CARD, type OgCardParams, ogCardUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export type SearchParams = Record<string, string | string[] | undefined>;

export function firstParam(params: SearchParams, key: string): string | undefined {
  const raw = params[key];
  return Array.isArray(raw) ? raw[0] : raw;
}

export function buildEmbedOpenGraph(
  origin: string,
  title: string,
  url: string,
  card: Omit<OgCardParams, "title"> = {},
): OpenGraph {
  return {
    title,
    description: SITE_DESCRIPTION,
    url,
    siteName: SITE_NAME,
    type: "article",
    locale: "en_US",
    images: [
      {
        url: ogCardUrl(origin, { title, ...card }),
        width: OG_CARD.width,
        height: OG_CARD.height,
        alt: title,
      },
    ],
  };
}
