"use client";

import { Box } from "@chakra-ui/react";

import { SplitRow } from "@/components/ui";

import type { TraceNode } from "../spec-runner";
import { formatSpecValue } from "../traceModel";
import DecisionTree from "./spec-trace/DecisionTree";
import ExpressionRow from "./spec-trace/ExpressionRow";
import { SpecPaneHeader, TreePaneHeader } from "./spec-trace/PaneHeaders";
import TransportRow, { type SpecTracePreset } from "./spec-trace/TransportRow";
import { usePlaybackKeys } from "./spec-trace/usePlaybackKeys";

export type { SpecTracePreset };

export type SpecTraceScreenProps = {
  root: TraceNode | null;
  error: string | null;
  tracing?: boolean;
  /** Index into the flat step list; drives both panes. */
  selectedIndex: number;
  stepCount: number;
  isPlaying: boolean;
  onSelectIndex: (index: number) => void;
  onTogglePlay: () => void;
  specPane: React.ReactNode;
  /** The algorithm actually traced — names the spec pane, links to tc39.es. */
  specId?: string;
  expression: string;
  onExpressionChange: (value: string) => void;
  onTrace: (value: string) => void;
  hint: React.ReactNode;
  presets: SpecTracePreset[];
  /** Category-specific control (the type-conversion algorithm picker). */
  extraControl?: React.ReactNode;
};

const SpecTraceScreen: React.FC<SpecTraceScreenProps> = ({
  root,
  error,
  tracing = false,
  selectedIndex,
  stepCount,
  isPlaying,
  onSelectIndex,
  onTogglePlay,
  specPane,
  specId,
  expression,
  onExpressionChange,
  onTrace,
  hint,
  presets,
  extraControl,
}) => {
  const result = root?.output ? formatSpecValue(root.output, Number.POSITIVE_INFINITY) : undefined;
  const complete = stepCount > 0 && selectedIndex >= stepCount - 1;

  usePlaybackKeys({ selectedIndex, onSelectIndex, onTogglePlay });

  return (
    <Box pt="10px" px="8px">
      <Box layerStyle="panel">
        <ExpressionRow
          expression={expression}
          onExpressionChange={onExpressionChange}
          onTrace={onTrace}
          result={result}
          tracing={tracing}
          error={error}
          hint={hint}
          extraControl={extraControl}
        />

        <TransportRow
          presets={presets}
          selectedIndex={selectedIndex}
          stepCount={stepCount}
          isPlaying={isPlaying}
          complete={complete}
          onSelectIndex={onSelectIndex}
          onTogglePlay={onTogglePlay}
        />

        <SplitRow
          storageKey="jsl-split-spectrace"
          defaultPercent={20}
          minLeftPercent={18}
          minRightPercent={35}
          left={
            <Box position="sticky" top="header" bg="surface.band">
              <SpecPaneHeader specId={specId} />
              {specPane}
            </Box>
          }
          right={
            <Box bg="surface.base">
              <TreePaneHeader />

              <DecisionTree
                root={root}
                selectedIndex={selectedIndex}
                onSelectIndex={onSelectIndex}
                result={result}
                complete={complete}
              />
            </Box>
          }
        />
      </Box>
    </Box>
  );
};

export default SpecTraceScreen;
