"use client";

import { Button } from "@chakra-ui/react";
import { CiPlay1 } from "react-icons/ci";

import { LogoLoader } from "@/components/ui";

import { usePipeline } from "../lib/pipelineContext";

const PipelineRunButton: React.FC = () => {
  const { analyze, running } = usePipeline();

  return (
    <Button
      size="sm"
      w={28}
      onClick={analyze}
      loading={running}
      loadingText="Running"
      disabled={running}
      spinner={<LogoLoader size={14} />}
    >
      <CiPlay1 /> Run
    </Button>
  );
};

export default PipelineRunButton;
