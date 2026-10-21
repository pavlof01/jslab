"use client";

import { Button } from "@chakra-ui/react";
import { CiPlay1 } from "react-icons/ci";

import { LogoLoader } from "@/components/ui";
import { RunStatus } from "@/lib/types";
import { useRunEngines, useRunStatus } from "@/store/engineOutputsSelectors";

const EmbedRunButton: React.FC = () => {
  const runEngines = useRunEngines();
  const { status } = useRunStatus();

  return (
    <Button
      size="xs"
      onClick={() => void runEngines()}
      loading={status === RunStatus.running}
      loadingText="Running"
      spinner={<LogoLoader size={12} />}
    >
      <CiPlay1 /> Run
    </Button>
  );
};

export default EmbedRunButton;
