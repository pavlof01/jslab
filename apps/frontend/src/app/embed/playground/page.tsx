import type { Metadata } from "next";

import FlagCatalogProvider from "@/components/FlagSelector/context";
import { fetchFlagCatalog } from "@/lib/server/flags";

import EmbedPlaygroundClient from "./EmbedPlaygroundClient";

export const metadata: Metadata = {
  title: "JSLab Embed",
  // Embeds are transient, per-snippet views; keep them out of the index.
  robots: { index: false, follow: false },
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
