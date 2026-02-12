"use client";

import * as React from "react";
import {
  Box,
  Button,
  Code,
  HStack,
  IconButton,
  Select,
  Slider,
  Text,
  VStack,
  createListCollection,
} from "@chakra-ui/react";
import { LuPause, LuPlay, LuSkipBack, LuSkipForward, LuStepBack, LuStepForward } from "react-icons/lu";

import type { TraceStep } from "@/app/coercion-visualizer/spec-runner";
import { getStepSummary } from "@/app/coercion-visualizer/traceModel";
import { Tooltip } from "@/components/ui/tooltip";

const speedCollection = createListCollection({
  items: [
    { label: "0.25x", value: "0.25" },
    { label: "0.5x", value: "0.5" },
    { label: "1x", value: "1" },
    { label: "2x", value: "2" },
  ],
});

export function PlaybackPanel({
  trace,
  selectedIndex,
  onSelectIndex,
  isPlaying,
  onTogglePlay,
  speed,
  onSpeedChange,
  keyStepIndices,
}: {
  trace: TraceStep[];
  selectedIndex: number;
  onSelectIndex: (next: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed: number;
  onSpeedChange: (next: number) => void;
  keyStepIndices: number[];
}) {
  const max = Math.max(0, trace.length - 1);
  const step = trace[selectedIndex];
  const summary = step ? getStepSummary(step) : undefined;

  const canBack = selectedIndex > 0;
  const canFwd = selectedIndex < max;

  const prevKeyMoment = React.useMemo(() => {
    for (let i = keyStepIndices.length - 1; i >= 0; i--) {
      const idx = keyStepIndices[i];
      if (idx < selectedIndex) return idx;
    }
    return undefined;
  }, [keyStepIndices, selectedIndex]);

  const nextKeyMoment = React.useMemo(() => {
    for (let i = 0; i < keyStepIndices.length; i++) {
      const idx = keyStepIndices[i];
      if (idx > selectedIndex) return idx;
    }
    return undefined;
  }, [keyStepIndices, selectedIndex]);

  return (
    <VStack align="stretch" gap={3}>
      <HStack justify="space-between" gap={3} flexWrap="wrap">
        <HStack gap={1}>
          <Tooltip content={<Text fontSize="xs">Previous key moment</Text>} disabled={prevKeyMoment === undefined}>
            <IconButton
              aria-label="Previous key moment"
              size="sm"
              variant="outline"
              disabled={prevKeyMoment === undefined}
              onClick={() => {
                if (prevKeyMoment !== undefined) onSelectIndex(prevKeyMoment);
              }}
            >
              <LuSkipBack />
            </IconButton>
          </Tooltip>
          <IconButton
            aria-label="Step back"
            size="sm"
            variant="outline"
            disabled={!canBack}
            onClick={() => onSelectIndex(Math.max(0, selectedIndex - 1))}
          >
            <LuStepBack />
          </IconButton>
          <IconButton
            aria-label={isPlaying ? "Pause" : "Play"}
            size="sm"
            variant={isPlaying ? "solid" : "outline"}
            colorPalette={isPlaying ? "green" : undefined}
            disabled={trace.length <= 1}
            onClick={onTogglePlay}
          >
            {isPlaying ? <LuPause /> : <LuPlay />}
          </IconButton>
          <IconButton
            aria-label="Step forward"
            size="sm"
            variant="outline"
            disabled={!canFwd}
            onClick={() => onSelectIndex(Math.min(max, selectedIndex + 1))}
          >
            <LuStepForward />
          </IconButton>
          <Tooltip content={<Text fontSize="xs">Next key moment</Text>} disabled={nextKeyMoment === undefined}>
            <IconButton
              aria-label="Next key moment"
              size="sm"
              variant="outline"
              disabled={nextKeyMoment === undefined}
              onClick={() => {
                if (nextKeyMoment !== undefined) onSelectIndex(nextKeyMoment);
              }}
            >
              <LuSkipForward />
            </IconButton>
          </Tooltip>
        </HStack>

        <HStack gap={3} align="center">
          <Text fontSize="xs" opacity={0.75}>
            step <Code>{trace.length ? selectedIndex + 1 : 0}</Code> / <Code>{trace.length}</Code>
          </Text>

          <Box minW="120px">
            <Select.Root
              size="sm"
              collection={speedCollection}
              value={[String(speed)]}
              onValueChange={(details) => {
                const raw = details.value[0];
                if (!raw) return;
                const n = Number(raw);
                if (Number.isFinite(n) && n > 0) onSpeedChange(n);
              }}
            >
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText placeholder="Speed" />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Select.Positioner>
                <Select.Content>
                  {speedCollection.items.map((item) => (
                    <Select.Item key={item.value} item={item}>
                      <Select.ItemText>{item.label}</Select.ItemText>
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
          </Box>
        </HStack>
      </HStack>

      <Box>
        <Text fontSize="xs" opacity={0.75} mb={1}>
          {summary ? (
            <>
              <Code>{summary.title}</Code>
              {summary.detail ? <> · {summary.detail}</> : null}
            </>
          ) : (
            "No trace"
          )}
        </Text>

        <Slider.Root
          min={0}
          max={max}
          step={1}
          disabled={trace.length <= 1}
          value={[Math.min(max, Math.max(0, selectedIndex))]}
          onValueChange={(details) => {
            const next = details.value[0];
            if (typeof next === "number") onSelectIndex(next);
          }}
        >
          <Slider.Control>
            <Slider.Track>
              <Slider.Range />
            </Slider.Track>
            <Tooltip
              content={
                summary ? (
                  <Text fontSize="xs">
                    {summary.title}
                    {summary.detail ? ` · ${summary.detail}` : ""}
                  </Text>
                ) : null
              }
              disabled={!summary}
              openDelay={200}
            >
              <Slider.Thumb index={0} />
            </Tooltip>
          </Slider.Control>
        </Slider.Root>
      </Box>

      {keyStepIndices.length ? (
        <VStack align="stretch" gap={1}>
          <Text fontSize="xs" opacity={0.75}>
            Key moments
          </Text>
          <HStack gap={2} flexWrap="wrap">
            {keyStepIndices.slice(0, 12).map((idx) => (
              <Button
                key={idx}
                size="xs"
                variant={idx === selectedIndex ? "solid" : "outline"}
                onClick={() => onSelectIndex(idx)}
              >
                #{idx + 1}
              </Button>
            ))}
            {keyStepIndices.length > 12 ? (
              <Text fontSize="xs" opacity={0.65}>
                +{keyStepIndices.length - 12} more
              </Text>
            ) : null}
          </HStack>
        </VStack>
      ) : null}
    </VStack>
  );
}
