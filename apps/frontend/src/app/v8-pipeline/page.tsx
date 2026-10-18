import type { Metadata } from "next";

import LayoutHintProvider from "@/components/LayoutHint/context";
import { isMobileRequest } from "@/lib/server/device";

import PipelineClient from "./components/PipelineClient";

export const metadata: Metadata = {
  title: "V8 Compilation Pipeline",
  description:
    "Step through every V8 compilation stage: lexer tokens, AST, Ignition bytecode, Maglev, and TurboFan.",
  alternates: {
    canonical: "/v8-pipeline",
  },
};

const V8PipelinePage = async () => {
  const mobile = await isMobileRequest();

  return (
    <LayoutHintProvider mobile={mobile}>
      <PipelineClient />
    </LayoutHintProvider>
  );
};

export default V8PipelinePage;
