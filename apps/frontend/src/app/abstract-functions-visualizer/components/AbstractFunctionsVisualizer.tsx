"use client";

import {
  Box,
  Grid,
  IconButton,
  DrawerRoot,
  DrawerBackdrop,
  DrawerPositioner,
  DrawerContent,
  DrawerBody,
  DrawerCloseTrigger,
} from "@chakra-ui/react";
import { LuBookOpen, LuX } from "react-icons/lu";

import { ExecutionTreePanel } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel";
import { EcmaSpecPanel } from "@/app/abstract-functions-visualizer/components/EcmaSpecPanel";
import { useVisualizerRuntime } from "@/app/abstract-functions-visualizer/useVisualizerRuntime";
import type { AlgoCategory, VisualizerInitialData } from "@/app/abstract-functions-visualizer/model";

export function AbstractFunctionsVisualizer({
  initialCategory = "typeConversion",
  initialData,
}: {
  initialCategory?: AlgoCategory;
  initialData?: VisualizerInitialData;
}) {
  const visualizer = useVisualizerRuntime(initialCategory, initialData);

  return (
    <>
      {/* Mobile FAB — rendered outside overflow:hidden container so fixed positioning works correctly */}
      <Box display={{ base: "flex", lg: "none" }} position="fixed" top={100} right={6} zIndex={40}>
        <IconButton
          aria-label="Open ECMA spec"
          size="sm"
          variant="outline"
          bg="overlay.100"
          backdropFilter="blur(8px)"
          borderColor="rgba(255,255,255,0.12)"
          onClick={() => visualizer.setSpecDrawerOpen(true)}
        >
          <LuBookOpen />
        </IconButton>
      </Box>

      <Box bg="background.300" h="calc(100dvh - var(--header-h))" overflow="hidden">
        {/* Mobile drawer for spec panel */}
        <Box display={{ base: "flex", lg: "none" }}>
          <DrawerRoot
            open={visualizer.specDrawerOpen}
            onOpenChange={(e) => visualizer.setSpecDrawerOpen(e.open)}
            placement="start"
            size="xs"
          >
            <DrawerBackdrop />
            <DrawerPositioner>
              <DrawerContent>
                <DrawerBody p={0} display="flex" flexDir="column" h="100%">
                  <Box display="flex" justifyContent="flex-end" p={2}>
                    <DrawerCloseTrigger asChild>
                      <IconButton aria-label="Close spec panel" size="sm" variant="ghost">
                        <LuX />
                      </IconButton>
                    </DrawerCloseTrigger>
                  </Box>
                  <Box flex={1} minH={0} overflow="hidden">
                    <EcmaSpecPanel
                      flatEntries={visualizer.flatEntries}
                      selectedIndex={visualizer.selectedIndex}
                      specHtml={visualizer.specHtml}
                    />
                  </Box>
                </DrawerBody>
              </DrawerContent>
            </DrawerPositioner>
          </DrawerRoot>
        </Box>

        <Grid templateColumns={{ base: "1fr", lg: "360px 1fr" }} h="full" overflow="hidden">
          {/* Desktop: spec panel in grid */}
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
              error={visualizer.error}
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
    </>
  );
}
