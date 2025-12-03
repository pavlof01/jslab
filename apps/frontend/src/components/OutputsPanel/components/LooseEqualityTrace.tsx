"use client";

import { useMemo, useState, useEffect } from "react";
import { Badge, Box, Flex, IconButton, Stack, Text, HStack, Button } from "@chakra-ui/react";
import { Popover, Portal } from "@chakra-ui/react";
import {
  FiBookOpen,
  FiChevronDown,
  FiChevronRight,
  FiPause,
  FiPlay,
  FiSkipBack,
  FiSkipForward,
  FiDownload,
} from "react-icons/fi";
import type { TraceNode, TraceJsType } from "@/lib/ecma262/isLooselyEqualTrace";
import { TRACE_TYPE_COLORS, traceTypeOf, exportTraceJson } from "@/lib/ecma262/isLooselyEqualTrace";
import { findLooseEqualityRule } from "@/lib/ecma262/looseEqualitySpec";

type TraceProps = {
  trace: TraceNode;
  activeId?: string;
  onSelectNode?: (node: TraceNode) => void;
  collapseDepth?: number;
};

export function LooseEqualityTrace({ trace, activeId, onSelectNode, collapseDepth = 2 }: TraceProps) {
  return (
    <Stack gap={3}>
      <TraceNodeCard node={trace} activeId={activeId} onSelectNode={onSelectNode} collapseDepth={collapseDepth} />
    </Stack>
  );
}

// --- player/stepper for autoplay and quick export ---

type PlayerProps = {
  trace: TraceNode;
  defaultCollapseDepth?: number;
  autoplayDelayMs?: number;
};

export function LooseEqualityTracePlayer({ trace, defaultCollapseDepth = 2, autoplayDelayMs = 900 }: PlayerProps) {
  const flat = useMemo(() => flattenTrace(trace), [trace]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => {
      setActiveIdx((idx) => {
        const next = Math.min(flat.length - 1, idx + 1);
        if (next === flat.length - 1) {
          setPlaying(false);
        }
        return next;
      });
    }, autoplayDelayMs);
    return () => clearTimeout(id);
  }, [playing, autoplayDelayMs, flat.length]);

  const activeId = flat[activeIdx]?.id;

  const go = (delta: number) => {
    setActiveIdx((idx) => Math.min(flat.length - 1, Math.max(0, idx + delta)));
    setPlaying(false);
  };

  const restart = () => {
    setActiveIdx(0);
    setPlaying(false);
  };

  const handleExport = () => {
    const json = exportTraceJson(trace);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "is-loosely-equal-trace.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack gap={3}>
      <HStack justify="space-between">
        <HStack>
          <IconButton
            size="sm"
            aria-label={playing ? "Pause autoplay" : "Play trace"}
            onClick={() => setPlaying((v) => !v)}
            variant="outline"
          >
            {playing ? <FiPause /> : <FiPlay />}
          </IconButton>
          <IconButton size="sm" aria-label="Prev step" onClick={() => go(-1)} variant="outline">
            <FiSkipBack />
          </IconButton>
          <IconButton size="sm" aria-label="Next step" onClick={() => go(1)} variant="outline">
            <FiSkipForward />
          </IconButton>
          <Button size="sm" variant="ghost" onClick={restart}>
            Reset
          </Button>
        </HStack>
        <HStack>
          <Text fontSize="sm" color="gray.400">
            Step {activeIdx + 1} / {flat.length}
          </Text>
          <IconButton size="sm" aria-label="Export trace JSON" onClick={handleExport} variant="outline">
            <FiDownload />
          </IconButton>
        </HStack>
      </HStack>

      <LooseEqualityTrace trace={trace} activeId={activeId} collapseDepth={defaultCollapseDepth} />
    </Stack>
  );
}

type CardProps = {
  node: TraceNode;
  activeId?: string;
  onSelectNode?: (node: TraceNode) => void;
  collapseDepth: number;
};

function TraceNodeCard({ node, activeId, onSelectNode, collapseDepth }: CardProps) {
  const [expanded, setExpanded] = useState(() => node.depth <= collapseDepth);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isActive = activeId === node.id;

  const typeX = useMemo(() => traceTypeOf(node.x), [node.x]);
  const typeY = useMemo(() => traceTypeOf(node.y), [node.y]);
  const ruleMeta = findLooseEqualityRule(node.rule);

  const handleSelect = () => onSelectNode?.(node);

  return (
    <Box ms={`${node.depth * 16}px`}>
      <Box
        border="1px solid"
        borderColor={isActive ? "teal.400" : "gray.700"}
        bg={isActive ? "rgba(56, 178, 172, 0.12)" : "rgba(17, 24, 39, 0.8)"}
        p={3}
        rounded="md"
        shadow="sm"
        onClick={handleSelect}
        cursor={onSelectNode ? "pointer" : "default"}
        _hover={{ borderColor: onSelectNode ? "teal.400" : undefined }}
      >
        <Flex align="center" gap={2}>
          {hasChildren ? (
            <IconButton
              size="xs"
              variant="ghost"
              aria-label={expanded ? "Collapse node" : "Expand node"}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
            >
              {expanded ? <FiChevronDown /> : <FiChevronRight />}
            </IconButton>
          ) : (
            <Box w="24px" />
          )}
          <Text fontSize="sm" fontWeight="semibold" color="gray.200">
            {node.rule ?? "Step"}
          </Text>
          <Text fontSize="xs" color="gray.500">
            depth {node.depth}
          </Text>
          {ruleMeta && (
            <Popover.Root lazyMount unmountOnExit>
              <Popover.Trigger asChild>
                <IconButton size="xs" variant="ghost" aria-label="Show spec" onClick={(e) => e.stopPropagation()}>
                  <FiBookOpen />
                </IconButton>
              </Popover.Trigger>
              <Portal>
                <Popover.Positioner>
                  <Popover.Content maxW="320px" bg="gray.900" color="gray.100" borderColor="gray.700">
                    <Popover.Arrow />
                    <Popover.Body>
                      <Text fontWeight="semibold">{ruleMeta.title}</Text>
                      <Text fontSize="sm" color="gray.300" mt={2}>
                        {ruleMeta.summary}
                      </Text>
                      {ruleMeta.detail && (
                        <Text fontSize="xs" color="gray.400" mt={2}>
                          {ruleMeta.detail}
                        </Text>
                      )}
                      {ruleMeta.anchor && (
                        <Text
                          as="a"
                          href={`https://tc39.es/ecma262/multipage/abstract-operations.html${ruleMeta.anchor}`}
                          target="_blank"
                          rel="noreferrer"
                          color="teal.300"
                          fontSize="xs"
                          mt={3}
                          display="inline-block"
                        >
                          Open spec
                        </Text>
                      )}
                    </Popover.Body>
                  </Popover.Content>
                </Popover.Positioner>
              </Portal>
            </Popover.Root>
          )}
        </Flex>

        <Flex mt={2} gap={3} wrap="wrap">
          <ValueBadge label="x" value={node.x} jsType={typeX} />
          <ValueBadge label="y" value={node.y} jsType={typeY} />
        </Flex>

        <Text mt={2} color="gray.300" fontSize="sm">
          {node.description}
        </Text>

        {node.result !== undefined && (
          <Text mt={2} fontWeight="semibold" color={node.result ? "green.300" : "red.300"}>
            Result: {String(node.result)}
          </Text>
        )}

        {node.threw && (
          <Text mt={2} fontWeight="semibold" color="orange.300">
            Threw during conversion {node.error ? `→ ${node.error}` : ""}
          </Text>
        )}
      </Box>

      {hasChildren && expanded && (
        <Stack mt={2} gap={3}>
          {node.children!.map((child) => (
            <TraceNodeCard
              key={child.id}
              node={child}
              activeId={activeId}
              onSelectNode={onSelectNode}
              collapseDepth={collapseDepth}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

type ValueProps = {
  label: string;
  value: unknown;
  jsType: TraceJsType;
};

function ValueBadge({ label, value, jsType }: ValueProps) {
  const color = TRACE_TYPE_COLORS[jsType];

  return (
    <Flex
      align="center"
      gap={1}
      px={2}
      py={1}
      bg="rgba(255,255,255,0.03)"
      rounded="md"
      border="1px solid"
      borderColor="gray.700"
    >
      <Text fontSize="xs" color="gray.400">
        {label}:
      </Text>
      <Text fontSize="sm" color="gray.100">
        {formatValue(value)}
      </Text>
      <Badge ml={1} color={color} borderColor={color} borderWidth="1px" bg="transparent" textTransform="none">
        {jsType}
      </Badge>
    </Flex>
  );
}

function flattenTrace(root: TraceNode): TraceNode[] {
  const res: TraceNode[] = [];
  const stack: TraceNode[] = [root];
  while (stack.length) {
    const node = stack.pop()!;
    res.push(node);
    const children = node.children ?? [];
    // push in reverse to keep original order when popping
    for (let i = children.length - 1; i >= 0; i -= 1) {
      stack.push(children[i]);
    }
  }
  return res;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "bigint") return `${value}n`;
  if (typeof value === "symbol") return value.toString();
  if (typeof value === "function") return "[Function]";
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[Object]";
    }
  }
  return String(value);
}
