import type { Metadata } from "next";
import PipelineClient from "./components/PipelineClient";

export const metadata: Metadata = {
  title: "V8 Compilation Pipeline",
  description:
    "Step through every V8 compilation stage: lexer tokens, AST, Ignition bytecode, Maglev, and TurboFan.",
  alternates: {
    canonical: "/v8-pipeline",
  },
};

export default function V8PipelinePage() {
  return <PipelineClient />;
}
