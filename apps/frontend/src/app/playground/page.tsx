import PlaygroundClient from "@/app/_components/PlaygroundClient";
import { EngineVersionProvider } from "@/components/EngineVersion/context";
import { FlagCatalogProvider } from "@/components/FlagSelector/context";
import { fetchEngineVersions } from "@/lib/server/engineVersions";
import { fetchFlagCatalog } from "@/lib/server/flags";

export const metadata = {
  title: "JavaScript Playground",
  description:
    "Write and run JavaScript, then read the bytecode each engine emits — V8, SpiderMonkey, Hermes and JSC, one tab per engine.",
  alternates: {
    canonical: "/playground",
  },
};

export const dynamic = "force-dynamic";

export default async function PlaygroundPage() {
  const [catalog, versions] = await Promise.all([fetchFlagCatalog(), fetchEngineVersions()]);

  return (
    <FlagCatalogProvider catalog={catalog}>
      <EngineVersionProvider versions={versions}>
        <PlaygroundClient />
      </EngineVersionProvider>
    </FlagCatalogProvider>
  );
}
