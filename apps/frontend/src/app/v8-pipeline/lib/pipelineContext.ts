"use client";

import { createContext, useContext } from "react";

import type { StageId } from "./stages";
import type { usePipelineRun } from "./usePipelineRun";

export type PipelineState = ReturnType<typeof usePipelineRun> & {
  code: string;
  setCode: (code: string) => void;
  active: StageId;
  setActive: (stage: StageId) => void;
};

export const PipelineContext = createContext<PipelineState | null>(null);

export function usePipeline(): PipelineState {
  const pipeline = useContext(PipelineContext);
  if (!pipeline) throw new Error("usePipeline must be used inside <PipelineProvider>");
  return pipeline;
}
