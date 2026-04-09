"use client";

import { HStack, Tag, Text, VStack } from "@chakra-ui/react";

import type { TraceTransition } from "@/app/abstract-functions-visualizer/spec-runner";
import { formatSpecValue } from "@/app/abstract-functions-visualizer/traceModel";

type Props = {
  transitions: TraceTransition[];
};

export const StepTransitions: React.FC<Props> = ({ transitions }) => {
  return (
    <VStack align="stretch" gap={1} mt={3}>
      {transitions.map((t, ord) => (
        <HStack key={ord} gap={2} flexWrap="wrap">
          <Tag.Root size="sm" variant="subtle" colorPalette="yellow">
            <Tag.Label>⚡ {t.kind}</Tag.Label>
          </Tag.Root>
          {t.kind === "coercion" ? (
            <Text fontFamily="mono" fontSize="xs" opacity={0.9}>
              {t.from.type}({formatSpecValue(t.from, 18)}) → {t.to.type}({formatSpecValue(t.to, 18)})
            </Text>
          ) : (
            <Text fontFamily="mono" fontSize="xs" opacity={0.9}>
              {formatSpecValue(t.from[0], 18)} + {formatSpecValue(t.from[1], 18)} → {formatSpecValue(t.to, 24)}
            </Text>
          )}
        </HStack>
      ))}
    </VStack>
  );
};

