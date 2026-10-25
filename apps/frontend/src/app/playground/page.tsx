import type { Metadata } from "next";

import PlaygroundShell from "@/app/_components/PlaygroundShell";
import EngineVersionProvider from "@/components/EngineVersion/context";
import FlagCatalogProvider from "@/components/FlagSelector/context";
import LayoutHintProvider from "@/components/LayoutHint/context";
import { buildEmbedOpenGraph, firstParam, type SearchParams } from "@/lib/embedMeta";
import { OEMBED_PATH } from "@/lib/embedState";
import { isMobileRequest } from "@/lib/server/device";
import { fetchEngineVersions } from "@/lib/server/engineVersions";
import { fetchFlagCatalog } from "@/lib/server/flags";
import {
  decodeShareState,
  PLAYGROUND_EMBED_TITLE,
  PLAYGROUND_PATH,
  SHARE_PARAM,
} from "@/lib/shareState";
import { SITE_ORIGIN, siteUrl } from "@/lib/site";

type Props = { searchParams: Promise<SearchParams> };

const TITLE = "JavaScript Playground";
const DESCRIPTION =
  "Write and run JavaScript, then read the bytecode each engine emits — V8, SpiderMonkey, Hermes and JSC, one tab per engine.";

export const generateMetadata = async ({ searchParams }: Props): Promise<Metadata> => {
  const param = firstParam(await searchParams, SHARE_PARAM);
  const shared = param ? decodeShareState(param) : null;
  if (!param || !shared) {
    return { title: TITLE, description: DESCRIPTION, alternates: { canonical: PLAYGROUND_PATH } };
  }

  const self = siteUrl(`${PLAYGROUND_PATH}?${SHARE_PARAM}=${encodeURIComponent(param)}`);
  const discovery = `${siteUrl(OEMBED_PATH)}?format=json&url=${encodeURIComponent(self)}`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: {
      canonical: self,
      types: { "application/json+oembed": discovery },
    },
    openGraph: buildEmbedOpenGraph(SITE_ORIGIN, PLAYGROUND_EMBED_TITLE, self, {
      subtitle: shared.code,
    }),
  };
};

export const dynamic = "force-dynamic";

const PlaygroundPage = async () => {
  const [catalog, versions, mobile] = await Promise.all([
    fetchFlagCatalog(),
    fetchEngineVersions(),
    isMobileRequest(),
  ]);

  return (
    <LayoutHintProvider mobile={mobile}>
      <FlagCatalogProvider catalog={catalog}>
        <EngineVersionProvider versions={versions}>
          <PlaygroundShell />
        </EngineVersionProvider>
      </FlagCatalogProvider>
    </LayoutHintProvider>
  );
};

export default PlaygroundPage;
