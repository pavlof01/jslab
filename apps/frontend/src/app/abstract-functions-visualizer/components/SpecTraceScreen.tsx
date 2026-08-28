"use client";

import { Box, useBreakpointValue } from "@chakra-ui/react";

import { SplitRow } from "@/components/ui";

import type { SpecValue, TraceNode } from "../spec-runner";
import { formatSpecValue } from "../traceModel";
import DecisionTree from "./spec-trace/DecisionTree";
import ExpressionRow from "./spec-trace/ExpressionRow";
import { SpecPaneHeader } from "./spec-trace/PaneHeaders";
import TransportRow, { type SpecTracePreset } from "./spec-trace/TransportRow";
import { usePlaybackKeys } from "./spec-trace/usePlaybackKeys";

export type { SpecTracePreset };

export type SpecTraceScreenProps = {
  root: TraceNode | null;
  /** What the traced operation returned — the service reports it even when the root frame carries no output. */
  resultValue?: SpecValue;
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
  resultValue,
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
  const output = resultValue ?? root?.output;
  const result = output && root ? formatSpecValue(output, Number.POSITIVE_INFINITY) : undefined;
  const complete = stepCount > 0 && selectedIndex >= stepCount - 1;

  usePlaybackKeys({ selectedIndex, onSelectIndex, onTogglePlay });

  const stacked = useBreakpointValue({ base: true, md: false }) ?? false;

  const specSide = (
    <Box
      display="flex"
      flexDirection="column"
      h={{ base: "auto", md: "100%" }}
      minH={0}
      bg="surface.band"
    >
      <SpecPaneHeader specId={specId} />
      {specPane}
    </Box>
  );

  const treeSide = (
    <Box
      display="flex"
      flexDirection="column"
      h={{ base: "auto", md: "100%" }}
      minH={0}
      bg="surface.base"
    >
      <DecisionTree root={root} selectedIndex={selectedIndex} onSelectIndex={onSelectIndex} />
    </Box>
  );

  return (
    <Box display="flex" flexDirection="column" flex="1" minH={0} pt="10px" px="8px" pb="10px">
      <Box layerStyle="panel" display="flex" flexDirection="column" flex="1" minH={0}>
        <ExpressionRow
          expression={expression}
          onExpressionChange={onExpressionChange}
          onTrace={onTrace}
          placeholder={presets[0]?.label}
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

        {stacked ? (
          <Box display="flex" flexDirection="column">
            {specSide}
            <Box borderTopWidth="1px" borderColor="rule.structural">
              {treeSide}
            </Box>
          </Box>
        ) : (
          <SplitRow
            storageKey="jsl-split-spectrace"
            defaultPercent={20}
            minLeftPercent={18}
            minRightPercent={35}
            flex="1"
            minH={0}
            left={specSide}
            right={treeSide}
          />
        )}
      </Box>
    </Box>
  );
};

export default SpecTraceScreen;
