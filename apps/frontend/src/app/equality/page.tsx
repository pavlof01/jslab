import type { Metadata } from "next";

import AbstractFunctionsVisualizer from "@/app/abstract-functions-visualizer/components/AbstractFunctionsVisualizer";
import { getVisualizerInitialData } from "@/app/abstract-functions-visualizer/server-data";

export const metadata: Metadata = {
  title: "Equality Operators Visualizer",
  description:
    "Step through ECMAScript abstract (==) and strict (===) equality, relational comparison, and the + operator one spec step at a time.",
  alternates: {
    canonical: "/equality",
  },
};

export const dynamic = "force-dynamic";

const EqualityPage = async () => {
  const initialData = await getVisualizerInitialData("equality");

  return <AbstractFunctionsVisualizer initialCategory="equality" initialData={initialData} />;
};

export default EqualityPage;
