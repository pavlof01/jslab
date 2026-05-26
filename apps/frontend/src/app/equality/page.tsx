import type { Metadata } from "next";

import { AbstractFunctionsVisualizer } from "@/app/abstract-functions-visualizer/components/AbstractFunctionsVisualizer";

export const metadata: Metadata = {
  title: "Equality Operators Visualizer",
  description:
    "Step through ECMAScript abstract (==) and strict (===) equality comparisons one spec step at a time.",
  alternates: {
    canonical: "/equality",
  },
};

export default function EqualityPage() {
  return <AbstractFunctionsVisualizer initialCategory="equality" />;
}
