"use client";

import * as React from "react";
import { Box, Container, Grid, Heading, Text, VStack } from "@chakra-ui/react";

import { ExecutionTreePanel } from "@/app/abstract-functions-visualizer/components/ExecutionTreePanel";
import { EcmaSpecPanel } from "@/app/abstract-functions-visualizer/components/EcmaSpecPanel";
import { useVisualizerStore } from "@/app/abstract-functions-visualizer/store";

const displayFont = "'Plus Jakarta Sans', Inter, var(--font-sans), sans-serif";
const subtleBorder = "rgba(255,255,255,0.08)";
const mutedText = "rgba(255,255,255,0.62)";

function AbstractFunctionsDemo() {
  const trace = useVisualizerStore((s) => s.trace);
  const selectedIndex = useVisualizerStore((s) => s.selectedIndex);
  const isPlaying = useVisualizerStore((s) => s.isPlaying);
  const selectedAlgo = useVisualizerStore((s) => s.selectedAlgo);
  const traceInputRaw = useVisualizerStore((s) => s.traceInputRaw);
  const traceInputExpression = useVisualizerStore((s) => s.traceInputExpression);
  const setSelectedAlgo = useVisualizerStore((s) => s.setSelectedAlgo);
  const setTraceInputRaw = useVisualizerStore((s) => s.setTraceInputRaw);
  const commitTraceInput = useVisualizerStore((s) => s.commitTraceInput);
  const onSelectIndex = useVisualizerStore((s) => s.onSelectIndex);
  const tickPlayback = useVisualizerStore((s) => s.tickPlayback);
  const runNow = useVisualizerStore((s) => s.runNow);
  const specHtml = useVisualizerStore((s) => s.specHtml);
  const setSpecHtml = useVisualizerStore((s) => s.setSpecHtml);
  React.useEffect(() => {
    fetch(`/api/spec/${selectedAlgo}`)
      .then((r) => r.text())
      .then(setSpecHtml)
      .catch(() => {});
  }, [selectedAlgo, setSpecHtml]);

  React.useEffect(() => {
    const t = window.setTimeout(() => runNow(), 150);
    return () => window.clearTimeout(t);
  }, [selectedAlgo, traceInputExpression, runNow]);

  React.useEffect(() => {
    if (!isPlaying || trace.length <= 1) return;
    const id = window.setInterval(tickPlayback, 650);
    return () => window.clearInterval(id);
  }, [isPlaying, trace.length, tickPlayback]);

  return (
    <Box
      h={{ base: "560px", md: "660px" }}
      borderWidth="1px"
      borderColor={subtleBorder}
      borderRadius="2xl"
      overflow="hidden"
      bg="#0a0a0a"
    >
      <Grid templateColumns={{ base: "1fr", lg: "360px 1fr" }} h="full" overflow="hidden">
        <Box minH={0} overflow="hidden" display={{ base: "none", lg: "block" }}>
          <EcmaSpecPanel trace={trace} selectedIndex={selectedIndex} specHtml={specHtml} />
        </Box>
        <Box position="relative" minH={0} h="100%">
          <ExecutionTreePanel
            trace={trace}
            selectedIndex={selectedIndex}
            entryLabel={selectedAlgo}
            onAlgoChange={setSelectedAlgo}
            userInputRaw={traceInputRaw}
            onSelectIndex={onSelectIndex}
            onInputChange={setTraceInputRaw}
            onInputCommit={commitTraceInput}
          />
        </Box>
      </Grid>
    </Box>
  );
}

export function AbstractFunctionsSection() {
  return (
    <Box
      as="section"
      position="relative"
      borderTopWidth="1px"
      borderColor={subtleBorder}
      px={{ base: 4, sm: 6, md: 20 }}
      py={{ base: 12, sm: 16, md: 20 }}
    >
      <Box aria-hidden="true" position="absolute" inset={0} pointerEvents="none" overflow="hidden">
        <Box
          position="absolute"
          top="20%"
          right="-8rem"
          h="24rem"
          w="24rem"
          borderRadius="full"
          bg="rgba(96,165,250,0.06)"
          filter="blur(120px)"
        />
        <Box
          position="absolute"
          bottom="10%"
          left="-6rem"
          h="18rem"
          w="18rem"
          borderRadius="full"
          bg="rgba(255,159,64,0.05)"
          filter="blur(100px)"
        />
      </Box>

      <Container maxW="7xl" px={0} position="relative">
        <VStack gap={{ base: 10, md: 14 }} align="stretch">
          <VStack gap={4} textAlign="center">
            <Text color="brand.300" fontSize="xs" fontWeight="700" letterSpacing="0.3em" textTransform="uppercase">
              Abstract Operations
            </Text>
            <Heading
              as="h2"
              fontFamily={displayFont}
              fontSize={{ base: "2xl", md: "4xl" }}
              fontWeight="900"
              letterSpacing="-0.04em"
            >
              Trace the Spec, Step by Step.
            </Heading>
            <Text color={mutedText} fontSize="base" lineHeight="1.8" maxW="2xl" mx="auto">
              Every implicit coercion runs a sequence of ECMAScript abstract operations. Pick an algorithm, enter any
              value, and step through the exact path the spec takes.
            </Text>
          </VStack>

          <AbstractFunctionsDemo />
        </VStack>
      </Container>
    </Box>
  );
}
