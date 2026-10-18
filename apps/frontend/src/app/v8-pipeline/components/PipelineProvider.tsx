"use client";

import { useState } from "react";

import { PipelineContext } from "../lib/pipelineContext";
import { PIPELINE_SAMPLE } from "../lib/sample";
import type { StageId } from "../lib/stages";
import { usePipelineRun } from "../lib/usePipelineRun";

type Props = { children: React.ReactNode };

const PipelineProvider: React.FC<Props> = ({ children }) => {
  const [code, setCode] = useState(PIPELINE_SAMPLE);
  const [active, setActive] = useState<StageId>("tokens");
  const run = usePipelineRun(code);

  return (
    <PipelineContext.Provider value={{ ...run, code, setCode, active, setActive }}>
      {children}
    </PipelineContext.Provider>
  );
};

export default PipelineProvider;
