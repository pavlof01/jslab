"use client";

import { Button, Flex, Span } from "@chakra-ui/react";

import Label from "@/components/ui/label";

export type SpecTracePreset = {
  label: string;
  active: boolean;
  onPick: () => void;
};

type Props = {
  presets: SpecTracePreset[];
  selectedIndex: number;
  stepCount: number;
  isPlaying: boolean;
  complete: boolean;
  onSelectIndex: (index: number) => void;
  onTogglePlay: () => void;
};

function transportLabel({
  isPlaying,
  complete,
}: {
  isPlaying: boolean;
  complete: boolean;
}): string {
  if (isPlaying) return "pause";
  if (complete) return "replay";
  return "play";
}

const TransportRow: React.FC<Props> = ({
  presets,
  selectedIndex,
  stepCount,
  isPlaying,
  complete,
  onSelectIndex,
  onTogglePlay,
}) => {
  return (
    <Flex
      wrap="wrap"
      align="center"
      justify="space-between"
      gap="12px 20px"
      py="11px"
      px="clamp(14px, 2vw, 20px)"
      borderColor="rule.structural"
      bg="surface.band"
    >
      <Flex
        textStyle="code"
        wrap="wrap"
        align="baseline"
        gap="6px clamp(10px, 1.6vw, 20px)"
        minW={0}
      >
        <Label>try</Label>
        {presets.map((preset) => (
          <Button
            variant="rule"
            typeface="prose"
            key={preset.label}
            type="button"
            onClick={preset.onPick}
            aria-pressed={preset.active}
            borderColor={preset.active ? "rule.accent" : "rule.link"}
            pt="2px"
            pb="3px"
            color={preset.active ? "accent" : "ink.4"}
            overflowWrap="anywhere"
          >
            {preset.label}
          </Button>
        ))}
      </Flex>

      <Flex wrap="wrap" align="center" gap="8px 12px">
        <Span
          textStyle="codeSm"
          color="ink.label"
          letterSpacing="0.08em"
          aria-label={`Step ${Math.min(selectedIndex + 1, stepCount)} of ${stepCount}`}
        >
          {String(Math.min(selectedIndex + 1, stepCount)).padStart(2, "0")} /{" "}
          {String(stepCount).padStart(2, "0")}
        </Span>
        <Button
          size="sm"
          onClick={() => onSelectIndex(selectedIndex - 1)}
          disabled={selectedIndex <= 0}
        >
          prev
        </Button>
        <Button size="sm" active onClick={onTogglePlay}>
          {transportLabel({ isPlaying, complete })}
        </Button>
        <Button
          size="sm"
          onClick={() => onSelectIndex(selectedIndex + 1)}
          disabled={stepCount === 0 || selectedIndex >= stepCount - 1}
        >
          next
        </Button>
      </Flex>
    </Flex>
  );
};

export default TransportRow;
