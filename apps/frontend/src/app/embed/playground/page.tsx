import type { Metadata } from "next";

import FlagCatalogProvider from "@/components/FlagSelector/context";
import { fetchFlagCatalog } from "@/lib/server/flags";
import { EMBED_PATH, PLAYGROUND_EMBED_TITLE } from "@/lib/shareState";
import { OG_CARD, ogCardUrl, SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN, siteUrl } from "@/lib/site";

import EmbedPlaygroundClient from "./EmbedPlaygroundClient";

export const metadata: Metadata = {
  title: "JSLab Embed",
  // Embeds are transient, per-snippet views; keep them out of the index.
  robots: { index: false, follow: false },
  openGraph: {
    title: PLAYGROUND_EMBED_TITLE,
    description: SITE_DESCRIPTION,
    url: siteUrl(EMBED_PATH),
    siteName: SITE_NAME,
    type: "article",
    locale: "en_US",
    images: [
      {
        url: ogCardUrl(SITE_ORIGIN, {
          title: PLAYGROUND_EMBED_TITLE,
          subtitle: "Run a snippet across V8, SpiderMonkey, Hermes and JSC.",
        }),
        width: OG_CARD.width,
        height: OG_CARD.height,
        alt: PLAYGROUND_EMBED_TITLE,
      },
    ],
  },
};

export const dynamic = "force-dynamic";

const EmbedPlaygroundPage = async () => {
  const catalog = await fetchFlagCatalog();

  return (
    <FlagCatalogProvider catalog={catalog}>
      <EmbedPlaygroundClient />
    </FlagCatalogProvider>
  );
};

export default EmbedPlaygroundPage;
