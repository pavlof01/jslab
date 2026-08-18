import PlaygroundClient from "@/app/_components/PlaygroundClient";
import { V8FlagCatalogProvider } from "@/components/V8FlagSelector/context";
import { fetchV8Flags } from "@/lib/server/v8Flags";

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
  const flags = await fetchV8Flags();

  return (
    <V8FlagCatalogProvider flags={flags}>
      <PlaygroundClient />
    </V8FlagCatalogProvider>
  );
}
