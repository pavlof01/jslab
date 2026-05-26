"use client";

import { Box, Grid } from "@chakra-ui/react";

import { ExecutionTreePanel } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel";
import { EcmaSpecPanel } from "@/app/abstract-functions-visualizer/components/EcmaSpecPanel";
import type { VisualizerInitialData } from "@/app/abstract-functions-visualizer/model";
import { useVisualizerRuntime } from "@/app/abstract-functions-visualizer/useVisualizerRuntime";

const subtleBorder = "rgba(255,255,255,0.08)";

type Props = {
  initialData?: VisualizerInitialData;
};

export function AbstractFunctionsDemo({ initialData }: Props) {
  const visualizer = useVisualizerRuntime("typeConversion", initialData);

  return (
    <Box
      h={{ base: "560px", md: "660px" }}
      borderWidth="1px"
      borderColor={subtleBorder}
      borderRadius="2xl"
      overflow="hidden"
      bg="background.300"
    >
      <Grid templateColumns={{ base: "1fr", lg: "360px 1fr" }} h="full" overflow="hidden">
        <Box minH={0} overflow="hidden" display={{ base: "none", lg: "block" }}>
          <EcmaSpecPanel
            flatEntries={visualizer.flatEntries}
            selectedIndex={visualizer.selectedIndex}
            specHtml={visualizer.specHtml}
          />
        </Box>
        <Box position="relative" minH={0} h="100%">
          <ExecutionTreePanel
            root={visualizer.root}
            flatEntries={visualizer.flatEntries}
            selectedIndex={visualizer.selectedIndex}
            category={visualizer.category}
            selectedAlgo={visualizer.selectedAlgo}
            detectedOperator={visualizer.detectedOperator}
            effectiveAlgoId={visualizer.effectiveAlgoId}
            onAlgoChange={visualizer.setSelectedAlgo}
            userInputRaw={visualizer.traceInputRaw}
            onSelectIndex={visualizer.onSelectIndex}
            onInputChange={visualizer.setTraceInputRaw}
            onInputCommit={visualizer.commitTraceInput}
            functionOptions={visualizer.functionOptions}
            functionMeta={visualizer.functionMeta}
          />
        </Box>
      </Grid>
    </Box>
  );
}
