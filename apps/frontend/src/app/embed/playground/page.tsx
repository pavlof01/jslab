import type { Metadata } from "next";
import EmbedPlaygroundClient from "./EmbedPlaygroundClient";

export const metadata: Metadata = {
  title: "JSLab Embed",
  // Embeds are transient, per-snippet views; keep them out of the index.
  robots: { index: false, follow: false },
};

export default function EmbedPlaygroundPage() {
  return <EmbedPlaygroundClient />;
}
