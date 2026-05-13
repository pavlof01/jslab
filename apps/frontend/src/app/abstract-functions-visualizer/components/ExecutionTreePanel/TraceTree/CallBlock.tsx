"use client";

import React from "react";
import { Box, Text } from "@chakra-ui/react";
import { LuChevronRight } from "react-icons/lu";
import { formatSpecValue } from "@/app/abstract-functions-visualizer/traceModel";
import { useVisualizerStore } from "@/app/abstract-functions-visualizer/store";
import type { TraceNode, TraceStep } from "@/app/abstract-functions-visualizer/spec-runner";
import { StepRow } from "./StepRow";

const BLOCK_COLOR = "#34d399";

interface Props {
  node: TraceNode;
  /** Path to this node's parent step (empty string for root). Each child step path = `${pathPrefix}.${i}` or `${i}`. */
  pathPrefix: string;
  activePath: string | null;
  onSelectPath: (path: string) => void;
  isRoot?: boolean;
}

function subNodeFromStep(step: TraceStep): TraceNode {
  return {
    algoId: step.algoId!,
    inputs: step.inputs ?? [],
    output: step.output,
    error: step.error,
    steps: step.steps ?? [],
    specUrl: step.specUrl,
  };
}

export function CallBlock({ node, pathPrefix, activePath, onSelectPath, isRoot = false }: Props) {
  const collapsedBlocks = useVisualizerStore((s) => s.collapsedBlocks);
  const toggleBlock = useVisualizerStore((s) => s.toggleBlock);
  const showSkipped = useVisualizerStore((s) => s.showSkipped);

  const collapseKey = pathPrefix; // root has empty key — never collapsed
  const isCollapsed = !isRoot && !!collapsedBlocks[collapseKey];

  const isActive = activePath !== null && (pathPrefix === "" || activePath === pathPrefix || activePath.startsWith(`${pathPrefix}.`));
  const color = BLOCK_COLOR;
  const borderColor = isActive ? color : `${color}30`;

  const argsStr = node.inputs.length > 0 ? node.inputs.map((a) => formatSpecValue(a, Infinity)).join(", ") : "";
  const returnStr = node.output ? formatSpecValue(node.output, Infinity) : null;

  function renderChildren() {
    return node.steps.map((step, i) => {
      const path = pathPrefix ? `${pathPrefix}.${i}` : String(i);
      const stepActive = activePath === path;
      const hidden = isCollapsed || (!showSkipped && step.kind === "if" && step.taken === false);

      const row = (
        <Box
          key={`row-${path}`}
          style={{
            display: "grid",
            gridTemplateRows: hidden ? "0fr" : "1fr",
            opacity: hidden ? 0 : 1,
            transition: "grid-template-rows 220ms ease, opacity 180ms ease",
          }}
        >
          <Box style={{ overflow: "hidden", minHeight: 0 }}>
            <StepRow step={step} isActive={stepActive} onSelect={() => onSelectPath(path)} />
          </Box>
        </Box>
      );

      if (step.kind === "call" && step.algoId && step.steps) {
        return (
          <React.Fragment key={path}>
            {row}
            {!hidden && (
              <CallBlock
                node={subNodeFromStep(step)}
                pathPrefix={path}
                activePath={activePath}
                onSelectPath={onSelectPath}
              />
            )}
          </React.Fragment>
        );
      }

      return row;
    });
  }

  if (isRoot) return <Box>{renderChildren()}</Box>;

  return (
    <Box borderLeft="1px solid" borderColor={borderColor} pl="14px" mb="8px" mt="4px" transition="border-color 150ms">
      <Box
        as="button"
        display="flex"
        alignItems="center"
        gap="10px"
        w="full"
        textAlign="left"
        pt="10px"
        pb="8px"
        pr="10px"
        cursor="pointer"
        _hover={{ bg: "rgba(255,255,255,0.02)" }}
        transition="background 120ms"
        onClick={() => toggleBlock(collapseKey)}
      >
        <Box
          flexShrink={0}
          color={color}
          style={{
            transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
            transition: "transform 130ms ease",
            display: "flex",
            alignItems: "center",
          }}
        >
          <LuChevronRight size={14} />
        </Box>

        <Text
          flex={1}
          fontSize="17px"
          fontWeight="bold"
          color={color}
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
        >
          {node.algoId}
          <Text as="span" fontWeight="normal" fontSize="13px" color={`${color}88`}>
            ({argsStr})
          </Text>
        </Text>

        {isCollapsed && (
          <Box flexShrink={0} px="7px" py="2px" borderRadius="full" bg={`${color}18`} border={`1px solid ${color}33`}>
            <Text fontSize="10px" color={`${color}CC`}>
              {node.steps.length} steps
            </Text>
          </Box>
        )}

        {returnStr && (
          <Text
            flexShrink={0}
            fontSize="11px"
            color="rgba(74,222,128,0.85)"
            whiteSpace="normal"
            wordBreak="break-word"
          >
            → {returnStr}
          </Text>
        )}
      </Box>

      <Box borderBottom={`1px dashed ${color}28`} mb="4px" />

      <Box pt="4px" pb="6px">
        {renderChildren()}
      </Box>
    </Box>
  );
}
