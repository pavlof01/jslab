"use client";

import React, { useEffect, useRef } from "react";
import { Box, VStack } from "@chakra-ui/react";

import type { CallStackFrame, TraceNode } from "@/app/abstract-functions-visualizer/spec-runner";
import type { FlatEntry } from "@/app/abstract-functions-visualizer/flatten";
import type { AlgoCategory, FunctionMetaShape } from "@/app/abstract-functions-visualizer/model";
import EntryPointSection from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/EntryPointSection";
import { CategoryTabs } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/CategoryTabs";
import { ExecutionTreeHeader } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/ExecutionTreeHeader";
import { CallBlock } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/TraceTree/CallBlock";
import { PlaybackDock } from "./PlaybackDock";

type Props = {
  root: TraceNode | null;
  error?: string | null;
  flatEntries: FlatEntry[];
  selectedIndex: number;
  category: AlgoCategory;
  selectedAlgo: string;
  detectedOperator: string | null;
  effectiveAlgoId: string | null;
  onAlgoChange?: (val: string) => void;
  userInputRaw: string;
  onSelectIndex?: (index: number) => void;
  onInputChange?: (val: string) => void;
  onInputCommit?: (val: string) => void;
  functionOptions?: string[];
  functionMeta?: Record<string, FunctionMetaShape>;
};

export const ExecutionTreePanel: React.FC<Props> = ({
  root,
  error,
  flatEntries,
  selectedIndex,
  category,
  selectedAlgo,
  detectedOperator,
  effectiveAlgoId,
  onAlgoChange,
  userInputRaw,
  onSelectIndex,
  onInputChange,
  onInputCommit,
  functionOptions,
  functionMeta,
}) => {
  const currentEntry = flatEntries[selectedIndex];
  const currentCallStack: CallStackFrame[] = currentEntry?.callStack ?? [];
  const activePath = currentEntry?.path ?? null;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>("[data-active='true']");
    if (!el) return;
    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const relativeTop = elRect.top - containerRect.top;
    const target = container.scrollTop + relativeTop - container.clientHeight / 2 + el.offsetHeight / 2;
    container.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, [selectedIndex]);

  const handleSelectPath = (path: string) => {
    if (!onSelectIndex) return;
    const i = flatEntries.findIndex((e) => e.path === path);
    if (i >= 0) onSelectIndex(i);
  };

  return (
    <Box position="relative" h="full">
      <ExecutionTreeHeader stack={currentCallStack} />

      <Box ref={scrollRef} flex="1" h="full" overflow="auto" pt={28} pb={32} px={{ base: 3, md: 6 }}>
        <VStack align="stretch" gap={0}>
          <CategoryTabs category={category} />
          <EntryPointSection
            category={category}
            onAlgoChange={onAlgoChange}
            selectedAlgo={selectedAlgo}
            detectedOperator={detectedOperator}
            effectiveAlgoId={effectiveAlgoId}
            userInputRaw={userInputRaw}
            onInputChange={onInputChange}
            onInputCommit={onInputCommit}
            functionOptions={functionOptions}
            functionMeta={functionMeta}
          />

          {error && !root && (
            <Box
              role="alert"
              mt={4}
              px={4}
              py={3}
              bg="red.950"
              border="1px solid"
              borderColor="red.800"
              rounded="md"
              color="red.300"
              fontSize="sm"
            >
              Couldn’t compute the trace: {error}
            </Box>
          )}

          {root && (
            <CallBlock
              node={root}
              pathPrefix=""
              activePath={activePath}
              onSelectPath={handleSelectPath}
              isRoot
            />
          )}
        </VStack>
      </Box>
      <PlaybackDock />
    </Box>
  );
};
