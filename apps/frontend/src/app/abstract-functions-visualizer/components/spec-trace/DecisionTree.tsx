"use client";

import { Box } from "@chakra-ui/react";
import { useEffect, useMemo, useRef } from "react";

import { StepNode } from "@/components/ui";

import { buildDecisionTree } from "../../decision-tree";
import type { TraceNode } from "../../spec-runner";

function rowStateAt(index: number, selectedIndex: number): "pending" | "current" | "done" {
  if (index > selectedIndex) return "pending";
  if (index === selectedIndex) return "current";
  return "done";
}

const FOLLOW_MARGIN_PX = 24;

function followStep(scroller: HTMLElement, selectedIndex: number): void {
  const row =
    scroller.querySelector<HTMLElement>(`[data-step-index="${selectedIndex}"]`) ??
    scroller.querySelector<HTMLElement>("[data-active]");
  if (!row) return;

  const pane = scroller.getBoundingClientRect();
  const rect = row.getBoundingClientRect();
  const top = rect.top - pane.top + scroller.scrollTop;
  const bottom = top + rect.height;
  const viewTop = scroller.scrollTop;
  const viewBottom = viewTop + scroller.clientHeight;

  let target: number | null = null;
  if (top < viewTop + FOLLOW_MARGIN_PX) target = top - FOLLOW_MARGIN_PX;
  else if (bottom > viewBottom - FOLLOW_MARGIN_PX) {
    target = bottom - scroller.clientHeight + FOLLOW_MARGIN_PX;
  }
  if (target === null) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  scroller.scrollTo({ top: Math.max(0, target), behavior: reduced ? "auto" : "smooth" });
}

type Props = {
  root: TraceNode | null;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
};

const DecisionTree: React.FC<Props> = ({ root, selectedIndex, onSelectIndex }) => {
  const nodes = useMemo(() => (root ? buildDecisionTree(root) : []), [root]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollerRef.current) followStep(scrollerRef.current, selectedIndex);
  }, [selectedIndex, root]);

  return (
    <Box
      ref={scrollerRef}
      flex={{ base: "none", md: "1" }}
      minH={0}
      overflowY="auto"
      overscrollBehavior="contain"
      pt="clamp(16px, 2.4vw, 26px)"
      px="clamp(14px, 2.4vw, 26px)"
      pb="clamp(10px, 1.6vw, 18px)"
    >
      {nodes.length === 0 ? (
        <Box textStyle="code" color="ink.label">
          No trace yet — enter an expression to run one.
        </Box>
      ) : (
        nodes.map((node) => {
          const lastOwn =
            node.actionIndex ?? node.tests[node.tests.length - 1]?.index ?? node.index;
          const onFrame =
            selectedIndex === node.index ||
            node.tests.some((test) => test.index === selectedIndex) ||
            node.actionIndex === selectedIndex;

          return (
            <StepNode
              key={node.path || "root"}
              op={node.op}
              args={node.args}
              result={node.result}
              resultRevealed={selectedIndex >= lastOwn}
              depth={node.depth}
              active={onFrame}
              data-active={onFrame ? "" : undefined}
              pending={node.index > selectedIndex}
              tests={node.tests.map((test) => ({
                ...test,
                state: rowStateAt(test.index, selectedIndex),
              }))}
              action={node.action}
              actionState={
                node.actionIndex == null ? "done" : rowStateAt(node.actionIndex, selectedIndex)
              }
              actionIndex={node.actionIndex}
              onClick={() => onSelectIndex(node.index)}
              onSelectTest={(i) => onSelectIndex(node.tests[i].index)}
            />
          );
        })
      )}
    </Box>
  );
};

export default DecisionTree;
