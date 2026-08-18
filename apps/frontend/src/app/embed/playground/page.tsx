import type { Metadata } from "next";

import { V8FlagCatalogProvider } from "@/components/V8FlagSelector/context";
import { fetchV8Flags } from "@/lib/server/v8Flags";
import EmbedPlaygroundClient from "./EmbedPlaygroundClient";

export const metadata: Metadata = {
  title: "JSLab Embed",
  // Embeds are transient, per-snippet views; keep them out of the index.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EmbedPlaygroundPage() {
  const flags = await fetchV8Flags();

  return (
    <V8FlagCatalogProvider flags={flags}>
      <EmbedPlaygroundClient />
    </V8FlagCatalogProvider>
  );
}
