"use client";

import { Box, HStack, Text } from "@chakra-ui/react";
import { LuChevronRight } from "react-icons/lu";
import type { TraceFrame } from "@/app/abstract-functions-visualizer/traceModel";

type Props = {
  stack: TraceFrame[];
};

export const ExecutionTreeHeader: React.FC<Props> = ({ stack }) => {
  return (
    <Box position="absolute" top={6} left={8} right={8} zIndex={2} pointerEvents="none">
      <HStack gap={4} align="center" flexWrap="wrap">
        <Text fontSize="2xl" fontWeight="black" letterSpacing="tight" textTransform="uppercase" flexShrink={0}>
          Decision Tree
        </Text>

        {stack.length > 0 && (
          <HStack
            gap={0}
            px={3}
            py={1}
            borderRadius="full"
            bg="overlay.100"
            borderWidth="1px"
            borderColor="rgba(255,255,255,0.08)"
            flexWrap="wrap"
            overflow="hidden"
          >
            {stack.map((frame, i) => {
              const isCurrent = i === stack.length - 1;
              const specUrl = frame.specUrl;
              return (
                <HStack key={i} gap={0} flexShrink={0}>
                  {i > 0 && (
                    <Box color="rgba(255,255,255,0.3)" mx={1} display="flex" alignItems="center">
                      <LuChevronRight size={10} />
                    </Box>
                  )}
                  {specUrl ? (
                    <a href={specUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                      <Text
                        fontSize="10px"
                        fontWeight={isCurrent ? "bold" : "normal"}
                        letterSpacing="widest"
                        textTransform="uppercase"
                        opacity={isCurrent ? 1 : 0.45}
                        color={isCurrent ? "#f9e31a" : undefined}
                        _hover={{ textDecoration: "underline", opacity: 1 }}
                      >
                        {frame.algoId}
                      </Text>
                    </a>
                  ) : (
                    <Text
                      fontSize="10px"
                      fontWeight={isCurrent ? "bold" : "normal"}
                      letterSpacing="widest"
                      textTransform="uppercase"
                      opacity={isCurrent ? 1 : 0.45}
                      color={isCurrent ? "#f9e31a" : undefined}
                    >
                      {frame.algoId}
                    </Text>
                  )}
                </HStack>
              );
            })}
          </HStack>
        )}
      </HStack>
    </Box>
  );
};
