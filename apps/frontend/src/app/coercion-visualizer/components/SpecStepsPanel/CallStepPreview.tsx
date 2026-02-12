"use client";

import * as React from "react";
import { Box, Button, Collapsible, HStack, Tag, Text, VStack } from "@chakra-ui/react";

import type { Algorithm } from "@/app/coercion-visualizer/spec-runner";
import { flattenInstrs } from "@/app/coercion-visualizer/components/SpecStepsPanel/specStepsUtils";

export function CallStepPreview({
  algoId,
  title,
  algo,
  open,
  onToggleOpen,
}: {
  algoId: string;
  title: string;
  algo?: Algorithm;
  open: boolean;
  onToggleOpen: () => void;
}) {
  const previewLines = React.useMemo(() => {
    if (!algo) return [];
    return flattenInstrs(algo.body, [], 0);
  }, [algo]);

  return (
    <Box px={1}>
      <HStack justify="space-between" align="center" gap={3} flexWrap="wrap">
        <HStack gap={2} flexWrap="wrap">
          <Tag.Root size="sm" colorPalette="orange" variant="subtle">
            <Tag.Label>call</Tag.Label>
          </Tag.Root>
          <Text fontSize="sm" fontFamily="mono">
            {title}
          </Text>
          <Tag.Root size="sm" colorPalette="orange" variant="outline">
            <Tag.Label>{algoId}</Tag.Label>
          </Tag.Root>
        </HStack>
        <Button size="xs" variant="outline" onClick={onToggleOpen} disabled={!algo}>
          {open ? "Hide callee" : "Show callee"}
        </Button>
      </HStack>

      {algo ? (
        <Collapsible.Root open={open}>
          <Collapsible.Content>
            <Box mt={2} borderWidth="1px" borderRadius="md" p={2} bg="bg.subtle">
              <VStack align="stretch" gap={1}>
                {previewLines.length ? (
                  <>
                    {previewLines.slice(0, 24).map((l, innerIdx) => (
                      <Text
                        key={`${algoId}:${innerIdx}:${l.text}`}
                        fontSize="xs"
                        fontFamily="mono"
                        opacity={l.kind === "branch" ? 0.75 : 0.9}
                        pl={l.indent * 10}
                        whiteSpace="pre-wrap"
                      >
                        {l.text}
                      </Text>
                    ))}
                    {previewLines.length > 24 ? (
                      <Text fontSize="xs" opacity={0.7}>
                        … {previewLines.length - 24} more line(s)
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text fontSize="xs" opacity={0.75}>
                    No steps.
                  </Text>
                )}
              </VStack>
            </Box>
          </Collapsible.Content>
        </Collapsible.Root>
      ) : null}
    </Box>
  );
}

