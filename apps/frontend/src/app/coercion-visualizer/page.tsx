import type { Metadata } from "next";

import { CoercionVisualizer } from "@/app/coercion-visualizer/components/CoercionVisualizer";

export const metadata: Metadata = {
  title: "Spec Execution Explorer",
  description: "Step-by-step explorer for ECMAScript algorithms (JSON IR).",
};

export default function CoercionVisualizerPage() {
  return <CoercionVisualizer />;
}
