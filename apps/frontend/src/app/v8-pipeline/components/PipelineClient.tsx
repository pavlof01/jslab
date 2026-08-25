"use client";

import { Box, Button, Flex, Splitter, Tabs, Text, useBreakpointValue } from "@chakra-ui/react";
import { useState } from "react";
import { CiPlay1 } from "react-icons/ci";

import EditorPanel from "@/components/EditorPanel";
import { LogoLoader } from "@/components/ui";

import { type ApiStageId, type StageId, STAGES } from "../lib/stages";
import { usePipelineRun } from "../lib/usePipelineRun";
import StageContent from "./StageContent";
import StageTabs from "./StageTabs";

const SAMPLE = `function add(a, b) {
  return a + b;
}

for (let i = 0; i < 400; i++) add(i, i + 1);

// uncomment to enable maglev opt
// for (let i = 0; i < 500; i++) add(i, i + 1);

// uncomment to enable sparkplug opt
// for (let i = 0; i < 10001; i++) add(i, i + 1);

// uncomment to enable force opt
// %PrepareFunctionForOptimization(add);
// %OptimizeFunctionOnNextCall(add);

// add(1, 2)`;

const PipelineClient: React.FC = () => {
  const [code, setCode] = useState(SAMPLE);
  const [active, setActive] = useState<StageId>("tokens");
  const { hasRun, running, error, outputs, visibleTokens, analyze, statusOf } =
    usePipelineRun(code);

  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;

  return (
    <Flex as="main" direction="column" height="calc(100dvh - {sizes.header})">
      <Flex
        h={14}
        bg="surface.band"
        borderBottom="1px solid"
        borderColor="rule.structural"
        px={4}
        align="center"
        justify="space-between"
        flexShrink={0}
      >
        <Text fontSize="sm" fontWeight="700" color="ink.label" letterSpacing="0.04em">
          V8 Compilation Pipeline
        </Text>
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
      </Flex>

      {error ? <RunError>{error}</RunError> : null}

      <Splitter.Root
        orientation={isMobile ? "vertical" : "horizontal"}
        panels={[
          { id: "editor", minSize: 15, collapsible: true, collapsedSize: 5 },
          { id: "pipeline", minSize: 30 },
        ]}
        defaultSize={[40, 60]}
        height="100%"
        overflow="hidden"
      >
        <Splitter.Panel id="editor">
          <Flex h="100%" bg="surface.band" overflow="hidden">
            <EditorPanel
              code={code}
              onCodeChange={(value) => setCode(value ?? "")}
              onRun={analyze}
            />
          </Flex>
        </Splitter.Panel>

        <Splitter.Context>
          {(ctx) => (
            <Splitter.ResizeTrigger id="editor:pipeline" onDoubleClick={() => ctx.resetSizes()} />
          )}
        </Splitter.Context>

        <Splitter.Panel id="pipeline">
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
                />
              </Tabs.Content>
            ))}
          </Tabs.Root>
        </Splitter.Panel>
      </Splitter.Root>
    </Flex>
  );
};

const RunError: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box
      role="alert"
      px={4}
      py={2}
      bg="status.errorSoft"
      borderBottom="1px solid"
      borderColor="status.errorRule"
      color="status.error"
      fontSize="xs"
      flexShrink={0}
    >
      {children}
    </Box>
  );
};

export default PipelineClient;
