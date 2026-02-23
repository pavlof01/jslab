"use client";

import { Box, HStack, Text } from "@chakra-ui/react";

export function ExecutionTreeHeader({ depth }: { depth: number }) {
  return (
    <Box position="absolute" top={6} left={8} zIndex={2}>
      <HStack gap={4} align="center">
        <Text fontSize="2xl" fontWeight="black" letterSpacing="tight" textTransform="uppercase">
          Decision Tree
        </Text>
        <HStack
          gap={2}
          px={3}
          py={1}
          borderRadius="full"
          bg="rgba(20,20,20,0.9)"
          borderWidth="1px"
          borderColor="rgba(255,255,255,0.08)"
        >
          <Box boxSize="8px" borderRadius="full" bg="#f9e31a" />
          <Text fontSize="10px" fontWeight="bold" letterSpacing="widest" textTransform="uppercase" opacity={0.85}>
            Recursive depth: {depth}
          </Text>
        </HStack>
      </HStack>
    </Box>
  );
}

