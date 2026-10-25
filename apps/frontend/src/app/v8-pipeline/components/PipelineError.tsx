"use client";

import { Callout } from "@/components/ui";

import { usePipeline } from "../lib/pipelineContext";

const PipelineError: React.FC = () => {
  const { error } = usePipeline();
  return error ? <Callout>{error}</Callout> : null;
};

export default PipelineError;
