import PlaygroundClient from "@/app/_components/PlaygroundClient";
import { FlagCatalogProvider } from "@/components/FlagSelector/context";
import { fetchFlagCatalog } from "@/lib/server/flags";

export const metadata = {
  title: "JavaScript Playground",
  description:
    "Compare JavaScript engines by writing and executing code. View bytecode across V8, SpiderMonkey, Hermes, and JSC.",
  alternates: {
    canonical: "/playground",
  },
};

export const dynamic = "force-dynamic";

export default async function PlaygroundPage() {
  const catalog = await fetchFlagCatalog();

  return (
    <FlagCatalogProvider catalog={catalog}>
      <PlaygroundClient />
    </FlagCatalogProvider>
  );
}
