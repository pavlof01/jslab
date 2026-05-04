"use client";

import { Box, Text } from "@chakra-ui/react";
import { LuChevronRight } from "react-icons/lu";
import { formatSpecValue } from "@/app/abstract-functions-visualizer/traceModel";
import { useVisualizerStore } from "@/app/abstract-functions-visualizer/store";
import { getDepthColor } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel/TraceStepNode/stepColors";
import type { CallNode } from "./treeBuilder";
import { treeContainsIndex, countSteps } from "./treeBuilder";
import { StepRow } from "./StepRow";

interface Props {
  node: CallNode;
  activeIndex: number;
  onSelectIndex: (i: number) => void;
  isRoot?: boolean;
  depth?: number;
}

export function CallBlock({ node, activeIndex, onSelectIndex, isRoot = false, depth = 0 }: Props) {
  const collapsedBlocks = useVisualizerStore((s) => s.collapsedBlocks);
  const toggleBlock = useVisualizerStore((s) => s.toggleBlock);
  const showSkipped = useVisualizerStore((s) => s.showSkipped);

  const isCollapsed = node.callStepIndex >= 0 && !!collapsedBlocks[node.callStepIndex];
  const isActive = treeContainsIndex(node, activeIndex);
  const totalSteps = countSteps(node);

  const color = getDepthColor(depth);
  const borderColor = isActive ? color : `${color}30`;
  const headerBg = isActive ? `${color}0d` : "transparent";

  const handleToggle = () => {
    if (node.callStepIndex >= 0) toggleBlock(node.callStepIndex);
  };

  const returnStr = node.returnValue ? formatSpecValue(node.returnValue, 24) : null;
  const argsStr = node.args.length > 0 ? node.args.map((a) => formatSpecValue(a, Infinity)).join(", ") : "";

  function renderChildren() {
    return node.children.map((child, i) => {
      if (child.kind === "step") {
        const hidden = isCollapsed || (!showSkipped && child.step.kind === "if" && child.step.isSkipped);
        return (
          <Box
            key={i}
            style={{
              display: "grid",
              gridTemplateRows: hidden ? "0fr" : "1fr",
              opacity: hidden ? 0 : 1,
              transition: "grid-template-rows 220ms ease, opacity 180ms ease",
            }}
          >
            <Box style={{ overflow: "hidden", minHeight: 0 }}>
              <StepRow
                node={child}
                isActive={child.traceIndex === activeIndex}
                onSelect={() => onSelectIndex(child.traceIndex)}
              />
            </Box>
          </Box>
        );
      }
      return (
        <CallBlock key={i} node={child} activeIndex={activeIndex} onSelectIndex={onSelectIndex} depth={depth + 1} />
      );
    });
  }

  // Root is a transparent wrapper — just render children directly
  if (isRoot) {
    return <Box>{renderChildren()}</Box>;
  }

  return (
    <Box borderLeft="1px solid" borderColor={borderColor} pl="14px" mb="8px" mt="4px" transition="border-color 150ms">
      {/* Header — clickable, always visible */}
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
        onClick={handleToggle}
      >
        {/* Chevron */}
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

        {/* Function name */}
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

        {/* Collapsed step count */}
        {isCollapsed && (
          <Box flexShrink={0} px="7px" py="2px" borderRadius="full" bg={`${color}18`} border={`1px solid ${color}33`}>
            <Text fontSize="10px" color={`${color}CC`}>
              {totalSteps} steps
            </Text>
          </Box>
        )}

        {/* Depth indicator */}
        <Text flexShrink={0} fontSize="11px" color="rgba(71,85,105,0.9)">
          d{depth}
        </Text>

        {/* Return value */}
        {returnStr && (
          <Text
            flexShrink={0}
            fontSize="11px"
            color="rgba(74,222,128,0.85)"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            maxW="180px"
          >
            → {returnStr}
          </Text>
        )}
      </Box>

      {/* Separator */}
      <Box borderBottom={`1px dashed ${color}28`} mb="4px" />

      {/* Body */}
      <Box pt="4px" pb="6px">
        {renderChildren()}
      </Box>
    </Box>
  );
}
