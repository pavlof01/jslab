import type { Metadata } from "next";

import { CoercionVisualizer } from "@/app/abstract-functions-visualizer/components/CoercionVisualizer";

export const metadata: Metadata = {
  title: "ToNumber Algorithm Visualizer",
  description: "Step-by-step visualizer for ECMAScript ToNumber algorithm.",
};

export default function CoercionVisualizerPage() {
  return <CoercionVisualizer />;
}
