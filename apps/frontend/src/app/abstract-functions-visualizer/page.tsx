import type { Metadata } from "next";

import { AbstractFunctionsVisualizer } from "@/app/abstract-functions-visualizer/components/AbstractFunctionsVisualizer";

export const metadata: Metadata = {
  title: "ToNumber Algorithm Visualizer",
  description: "Step-by-step visualizer for ECMAScript ToNumber algorithm.",
};

export default function AbstractFunctionsVisualizerPage() {
  return <AbstractFunctionsVisualizer />;
}
