import type { Metadata } from "next";

import FlagCatalogProvider from "@/components/FlagSelector/context";
import { buildEmbedOpenGraph } from "@/lib/embedMeta";
import { fetchFlagCatalog } from "@/lib/server/flags";
import { EMBED_PATH, PLAYGROUND_EMBED_TITLE } from "@/lib/shareState";
import { SITE_ORIGIN, siteUrl } from "@/lib/site";

import EmbedPlaygroundClient from "./EmbedPlaygroundClient";

export const metadata: Metadata = {
  title: "JSLab Embed",
  // Embeds are transient, per-snippet views; keep them out of the index.
  robots: { index: false, follow: false },
  openGraph: buildEmbedOpenGraph(SITE_ORIGIN, PLAYGROUND_EMBED_TITLE, siteUrl(EMBED_PATH), {
    subtitle: "Run a snippet across V8, SpiderMonkey, Hermes and JSC.",
  }),
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
