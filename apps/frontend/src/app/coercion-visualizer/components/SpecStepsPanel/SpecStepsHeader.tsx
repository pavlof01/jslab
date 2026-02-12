"use client";

import { Button, Code, HStack, Switch, Tag, Text, VStack } from "@chakra-ui/react";

import type { Algorithm } from "@/app/coercion-visualizer/spec-runner";
import { formatNodePath, type NodePath } from "@/app/coercion-visualizer/traceModel";

export type BreadcrumbFrame = {
  id: string;
  title: string;
  isCurrent: boolean;
};

export function SpecStepsHeader({
  rootAlgo,
  stackLabel,
  breadcrumbFrames,
  onScrollToFrame,
  highlightNodePath,
  currentAlgoTitle,
  showDetails,
  onShowDetailsChange,
  debugOpen,
  onToggleDebug,
  debugEnabled,
}: {
  rootAlgo?: Algorithm;
  stackLabel?: string;
  breadcrumbFrames: BreadcrumbFrame[];
  onScrollToFrame?: (frameId: string) => void;
  highlightNodePath?: NodePath;
  currentAlgoTitle?: string;
  showDetails: boolean;
  onShowDetailsChange: (checked: boolean) => void;
  debugOpen: boolean;
  onToggleDebug: () => void;
  debugEnabled: boolean;
}) {
  return (
    <HStack justify="space-between" align="start" gap={4}>
      <VStack align="start" gap={0.5}>
        <Text fontWeight="semibold">Spec Steps</Text>
        <Text fontSize="xs" opacity={0.75}>
          {rootAlgo ? (
            <>
              <Code>{rootAlgo.title ?? rootAlgo.id}</Code>
              {stackLabel ? <> · stack: {stackLabel}</> : null}
            </>
          ) : (
            "No active algorithm"
          )}
        </Text>
        {breadcrumbFrames.length ? (
          <VStack align="start" gap={0} mt={1}>
            {breadcrumbFrames.map((f, idx) => (
              <HStack key={f.id} gap={2} pl={idx * 3} opacity={idx === breadcrumbFrames.length - 1 ? 1 : 0.85}>
                <Text fontSize="xs" opacity={0.8}>
                  {idx === 0 ? "" : "↳"}
                </Text>
                <Button
                  size="xs"
                  variant="ghost"
                  px={1}
                  onClick={onScrollToFrame ? () => onScrollToFrame(f.id) : undefined}
                  title="Scroll to this frame"
                >
                  <Text fontSize="xs" fontFamily="mono">
                    {f.title}
                  </Text>
                </Button>
                <Text fontSize="xs" opacity={0.6}>
                  <Code>{f.id}</Code>
                </Text>
                {f.isCurrent ? (
                  <Tag.Root size="sm" colorPalette="blue" variant="subtle">
                    <Tag.Label>current</Tag.Label>
                  </Tag.Root>
                ) : null}
              </HStack>
            ))}
          </VStack>
        ) : null}
        {highlightNodePath?.length ? (
          <Text fontSize="xs" opacity={0.7}>
            nodePath: <Code>{formatNodePath(highlightNodePath)}</Code>
          </Text>
        ) : null}
        {currentAlgoTitle ? (
          <Text fontSize="xs" opacity={0.7}>
            in: <Code>{currentAlgoTitle}</Code>
          </Text>
        ) : null}
      </VStack>

      <VStack align="end" gap={2}>
        <Switch.Root checked={showDetails} onCheckedChange={(d) => onShowDetailsChange(d.checked)} size="sm">
          <Switch.HiddenInput />
          <HStack gap={2} align="center">
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Switch.Label>Details</Switch.Label>
          </HStack>
        </Switch.Root>
        <Button size="sm" variant="outline" onClick={onToggleDebug} disabled={!debugEnabled}>
          {debugOpen ? "Hide JSON" : "Show JSON"}
        </Button>
      </VStack>
    </HStack>
  );
}
