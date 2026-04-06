"use client";

import * as React from "react";
import { Box, HStack, IconButton, Text } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight, LuPause, LuPlay, LuRotateCcw, LuSkipBack, LuSkipForward, LuEye, LuEyeOff } from "react-icons/lu";

import { Tooltip } from "@/components/ui/tooltip";

export function PlaybackDock({
  selectedIndex,
  maxIndex,
  isPlaying,
  onTogglePlay,
  onSelectIndex,
  showSkipped = false,
  onToggleSkipped,
}: {
  selectedIndex: number;
  maxIndex: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSelectIndex: (next: number) => void;
  showSkipped?: boolean;
  onToggleSkipped?: () => void;
}) {
  const canBack = selectedIndex > 0;
  const canFwd = selectedIndex < maxIndex;

  return (
    <Box
      position={{ base: "fixed", lg: "absolute" }}
      bottom={{ base: 4, lg: 10 }}
      left="50%"
      transform="translateX(-50%)"
      zIndex={30}
      bg="rgba(20,20,20,0.92)"
      borderWidth="1px"
      borderColor="rgba(255,255,255,0.08)"
      backdropFilter="blur(16px)"
      px={3}
      py={2.5}
      borderRadius="2rem"
      boxShadow="0 24px 50px rgba(0,0,0,0.45)"
    >
      <HStack gap={2} align="center">
        <Tooltip content={<Text fontSize="xs">To start</Text>}>
          <IconButton
            aria-label="To start"
            size="md"
            variant="ghost"
            color="rgba(148,163,184,1)"
            disabled={!canBack}
            onClick={() => onSelectIndex(0)}
          >
            <LuSkipBack />
          </IconButton>
        </Tooltip>

        <Tooltip content={<Text fontSize="xs">Previous</Text>}>
          <IconButton
            aria-label="Previous step"
            size="md"
            variant="ghost"
            color="rgba(148,163,184,1)"
            disabled={!canBack}
            onClick={() => onSelectIndex(Math.max(0, selectedIndex - 1))}
          >
            <LuChevronLeft />
          </IconButton>
        </Tooltip>

        <Box px={2}>
          <Tooltip content={<Text fontSize="xs">{isPlaying ? "Pause" : "Play"}</Text>}>
            <IconButton
              aria-label={isPlaying ? "Pause" : "Play"}
              size="lg"
              borderRadius="full"
              bg="#f9e31a"
              color="black"
              _hover={{ transform: "scale(1.05)", bg: "#f9e31a" }}
              _active={{ transform: "scale(0.96)" }}
              transition="transform 140ms ease"
              disabled={maxIndex <= 0}
              onClick={onTogglePlay}
            >
              {isPlaying ? <LuPause /> : <LuPlay />}
            </IconButton>
          </Tooltip>
        </Box>

        <Tooltip content={<Text fontSize="xs">Next</Text>}>
          <IconButton
            aria-label="Next step"
            size="md"
            variant="ghost"
            color="rgba(148,163,184,1)"
            disabled={!canFwd}
            onClick={() => onSelectIndex(Math.min(maxIndex, selectedIndex + 1))}
          >
            <LuChevronRight />
          </IconButton>
        </Tooltip>

        <Tooltip content={<Text fontSize="xs">To end</Text>}>
          <IconButton
            aria-label="To end"
            size="md"
            variant="ghost"
            color="rgba(148,163,184,1)"
            disabled={!canFwd}
            onClick={() => onSelectIndex(maxIndex)}
          >
            <LuSkipForward />
          </IconButton>
        </Tooltip>

        <Box w="1px" h="32px" bg="rgba(38,38,38,1)" mx={1} />

        <Tooltip content={<Text fontSize="xs">Restart</Text>}>
          <IconButton
            aria-label="Restart"
            size="md"
            variant="ghost"
            color="rgba(148,163,184,1)"
            _hover={{ color: "rgba(248,113,113,1)", bg: "rgba(248,113,113,0.10)" }}
            onClick={() => onSelectIndex(0)}
          >
            <LuRotateCcw />
          </IconButton>
        </Tooltip>

        <Box w="1px" h="32px" bg="rgba(38,38,38,1)" mx={1} />

        <Tooltip content={<Text fontSize="xs">{showSkipped ? "Hide skipped steps" : "Show skipped steps"}</Text>}>
          <IconButton
            aria-label={showSkipped ? "Hide skipped steps" : "Show skipped steps"}
            size="md"
            variant="ghost"
            color={showSkipped ? "rgba(249,227,26,1)" : "rgba(148,163,184,1)"}
            _hover={{ color: "rgba(249,227,26,1)", bg: "rgba(249,227,26,0.08)" }}
            onClick={onToggleSkipped}
          >
            {showSkipped ? <LuEye /> : <LuEyeOff />}
          </IconButton>
        </Tooltip>
      </HStack>
    </Box>
  );
}
