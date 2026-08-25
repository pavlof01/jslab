import type { Metadata } from "next";

import AbstractFunctionsVisualizer from "@/app/abstract-functions-visualizer/components/AbstractFunctionsVisualizer";
import { getVisualizerInitialData } from "@/app/abstract-functions-visualizer/server-data";

export const metadata: Metadata = {
  title: "Type Conversion Visualizer",
  description:
    "Step through ECMAScript type-conversion abstract operations (ToNumber, ToPrimitive, ToString) one spec step at a time.",
  alternates: {
    canonical: "/type-conversion",
  },
};

export const dynamic = "force-dynamic";

const TypeConversionPage = async () => {
  const initialData = await getVisualizerInitialData("typeConversion");

  return <AbstractFunctionsVisualizer initialCategory="typeConversion" initialData={initialData} />;
};

export default TypeConversionPage;
