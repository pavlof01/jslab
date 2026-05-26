import type { Metadata } from "next";

import { AbstractFunctionsVisualizer } from "@/app/abstract-functions-visualizer/components/AbstractFunctionsVisualizer";
import { getVisualizerInitialData } from "@/app/abstract-functions-visualizer/server-data";

export const metadata: Metadata = {
  title: "Equality Operators Visualizer",
  description:
    "Step through ECMAScript abstract (==) and strict (===) equality comparisons one spec step at a time.",
  alternates: {
    canonical: "/equality",
  },
};

export const dynamic = "force-dynamic";

export default async function EqualityPage() {
  const initialData = await getVisualizerInitialData("equality");

  return <AbstractFunctionsVisualizer initialCategory="equality" initialData={initialData} />;
}
