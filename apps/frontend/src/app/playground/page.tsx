import type { Metadata } from "next";

import PlaygroundClient from "@/app/_components/PlaygroundClient";
import EngineVersionProvider from "@/components/EngineVersion/context";
import FlagCatalogProvider from "@/components/FlagSelector/context";
import { EMBED_THUMBNAIL, OEMBED_PATH } from "@/lib/embedState";
import { fetchEngineVersions } from "@/lib/server/engineVersions";
import { fetchFlagCatalog } from "@/lib/server/flags";
import {
  decodeShareState,
  PLAYGROUND_EMBED_TITLE,
  PLAYGROUND_PATH,
  SHARE_PARAM,
} from "@/lib/shareState";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const TITLE = "JavaScript Playground";
const DESCRIPTION =
  "Write and run JavaScript, then read the bytecode each engine emits — V8, SpiderMonkey, Hermes and JSC, one tab per engine.";

export const generateMetadata = async ({ searchParams }: Props): Promise<Metadata> => {
  const raw = (await searchParams)[SHARE_PARAM];
  const param = Array.isArray(raw) ? raw[0] : raw;
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
    openGraph: {
      title: PLAYGROUND_EMBED_TITLE,
      description: SITE_DESCRIPTION,
      url: self,
      siteName: SITE_NAME,
      type: "article",
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
};

export const dynamic = "force-dynamic";

const PlaygroundPage = async () => {
  const [catalog, versions] = await Promise.all([fetchFlagCatalog(), fetchEngineVersions()]);

  return (
    <FlagCatalogProvider catalog={catalog}>
      <EngineVersionProvider versions={versions}>
        <PlaygroundClient />
      </EngineVersionProvider>
    </FlagCatalogProvider>
  );
};

export default PlaygroundPage;
