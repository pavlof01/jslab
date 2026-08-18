"use client";

import { useMemo } from "react";

import { Box, Flex, Span } from "@chakra-ui/react";

import { StepNode } from "@/components/ui";
import { buildDecisionTree } from "../../decision-tree";
import type { TraceNode } from "../../spec-runner";

function rowStateAt(index: number, selectedIndex: number): "pending" | "current" | "done" {
  if (index > selectedIndex) return "pending";
  if (index === selectedIndex) return "current";
  return "done";
}

type Props = {
  root: TraceNode | null;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  result?: string;
  complete: boolean;
};

export function DecisionTree({ root, selectedIndex, onSelectIndex, result, complete }: Props) {
  const nodes = useMemo(() => (root ? buildDecisionTree(root) : []), [root]);
  const frameCount = nodes.length;

  return (
    <Box pt="clamp(16px, 2.4vw, 26px)" px="clamp(14px, 2.4vw, 26px)" pb="clamp(10px, 1.6vw, 18px)">
      {nodes.length === 0 ? (
        <Box textStyle="code" color="ink.label">
          No trace yet — enter an expression to run one.
        </Box>
      ) : (
        nodes.map((node) => {
          const lastOwn = node.actionIndex ?? node.tests[node.tests.length - 1]?.index ?? node.index;
          const onFrame =
            selectedIndex === node.index ||
            node.tests.some((test) => test.index === selectedIndex) ||
            node.actionIndex === selectedIndex;

          return (
            <StepNode
              key={node.path || "root"}
              op={node.op}
              args={node.args}
              result={selectedIndex >= lastOwn ? node.result : undefined}
              depth={node.depth}
              active={onFrame}
              pending={node.index > selectedIndex}
              tests={node.tests.map((test) => ({ ...test, state: rowStateAt(test.index, selectedIndex) }))}
              action={node.action}
              actionState={node.actionIndex == null ? "done" : rowStateAt(node.actionIndex, selectedIndex)}
              onClick={() => onSelectIndex(node.index)}
              onSelectTest={(i) => onSelectIndex(node.tests[i].index)}
            />
          );
        })
      )}

      {result && complete ? (
        <Flex
          wrap="wrap"
          align="baseline"
          gap="8px 16px"
          mt="4px"
          pt="14px"
          borderTopWidth="1px"
          borderColor="rule.accentDim"
          transitionProperty="opacity"
          transitionDuration="result"
          transitionTimingFunction="DEFAULT"
        >
          <Span textStyle="label" color="ink.label">
            returns
          </Span>
          <Span fontFamily="mono" fontSize="clamp(16px, 1.6vw, 20px)" color="accent" overflowWrap="anywhere">
            {result}
          </Span>
          <Span textStyle="code" color="ink.label">
            unwinding back through {frameCount} {frameCount === 1 ? "frame" : "frames"}
          </Span>
        </Flex>
      ) : null}
    </Box>
  );
}
