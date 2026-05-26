import type { Metadata } from "next";

import { AbstractFunctionsVisualizer } from "@/app/abstract-functions-visualizer/components/AbstractFunctionsVisualizer";

export const metadata: Metadata = {
  title: "Type Conversion Visualizer",
  description:
    "Step through ECMAScript type-conversion abstract operations (ToNumber, ToPrimitive, ToString) one spec step at a time.",
  alternates: {
    canonical: "/type-conversion",
  },
};

export default function TypeConversionPage() {
  return <AbstractFunctionsVisualizer initialCategory="typeConversion" />;
}
