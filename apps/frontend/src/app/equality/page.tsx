import type { Metadata } from "next";

import AbstractFunctionsVisualizer from "@/app/abstract-functions-visualizer/components/AbstractFunctionsVisualizer";
import { getVisualizerInitialData } from "@/app/abstract-functions-visualizer/server-data";
import LayoutHintProvider from "@/components/LayoutHint/context";
import { isMobileRequest } from "@/lib/server/device";

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
  const [initialData, mobile] = await Promise.all([
    getVisualizerInitialData("equality"),
    isMobileRequest(),
  ]);

  return (
    <LayoutHintProvider mobile={mobile}>
      <AbstractFunctionsVisualizer initialCategory="equality" initialData={initialData} />
    </LayoutHintProvider>
  );
};

export default EqualityPage;
