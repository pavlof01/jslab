"use client";

import { Tabs } from "@chakra-ui/react";

import { usePipeline } from "../lib/pipelineContext";
import { type ApiStageId, type StageId, STAGES } from "../lib/stages";
import StageContent from "./StageContent";
import StageTabs from "./StageTabs";

const PipelineStages: React.FC = () => {
  const { active, setActive, statusOf, outputs, visibleTokens, hasRun, runCode } = usePipeline();

  return (
    <Tabs.Root
      value={active}
      onValueChange={({ value }) => setActive(value as StageId)}
      variant="plain"
      display="flex"
      flexDirection="column"
      fitted
      h="100%"
      bg="surface.base"
      lazyMount
    >
      <StageTabs statusOf={statusOf} />

      {STAGES.map((stage) => (
        <Tabs.Content
          key={stage.id}
          value={stage.id}
          overflow="auto"
          display="flex"
          flex="1"
          flexDirection="column"
          pt={0}
        >
          <StageContent
            stage={stage}
            output={outputs[stage.id as ApiStageId]}
            tokens={visibleTokens}
            hasRun={hasRun}
            source={runCode}
          />
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
};

export default PipelineStages;
