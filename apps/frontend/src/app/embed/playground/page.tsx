import type { Metadata } from "next";

import { buildEmbedOpenGraph, firstParam, type SearchParams } from "@/lib/embedMeta";
import {
  decodeShareState,
  EMBED_PATH,
  PLAYGROUND_EMBED_TITLE,
  SHARE_PARAM,
} from "@/lib/shareState";
import { SITE_ORIGIN, siteUrl } from "@/lib/site";

import EmbedPlaygroundShell from "./EmbedPlaygroundShell";

type Props = { searchParams: Promise<SearchParams> };

export const generateMetadata = async ({ searchParams }: Props): Promise<Metadata> => {
  const param = firstParam(await searchParams, SHARE_PARAM);
  const shared = param ? decodeShareState(param) : null;
  const self = siteUrl(
    shared && param ? `${EMBED_PATH}?${SHARE_PARAM}=${encodeURIComponent(param)}` : EMBED_PATH,
  );

  return {
    title: "JSLab Embed",
    // Embeds are transient, per-snippet views; keep them out of the index.
    robots: { index: false, follow: false },
    alternates: { canonical: self },
    openGraph: buildEmbedOpenGraph(SITE_ORIGIN, PLAYGROUND_EMBED_TITLE, self, {
      subtitle: shared?.code ?? "Run a snippet across V8, SpiderMonkey, Hermes and JSC.",
    }),
  };
};

export const dynamic = "force-dynamic";

const EmbedPlaygroundPage = () => <EmbedPlaygroundShell />;

export default EmbedPlaygroundPage;
