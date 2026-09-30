import type { Metadata } from "next";

import FlagCatalogProvider from "@/components/FlagSelector/context";
import { EMBED_THUMBNAIL } from "@/lib/embedState";
import { fetchFlagCatalog } from "@/lib/server/flags";
import { EMBED_PATH, PLAYGROUND_EMBED_TITLE } from "@/lib/shareState";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";

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
        url: siteUrl(EMBED_THUMBNAIL.path),
        width: EMBED_THUMBNAIL.width,
        height: EMBED_THUMBNAIL.height,
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
