"use client";

import { Box, Card, Text, VStack } from "@chakra-ui/react";

export function EntryPointSection({ entryLabel, hasNodes }: { entryLabel: string; hasNodes: boolean }) {
  return (
    <VStack align="center" gap={0}>
      <Card.Root
        size="sm"
        borderWidth="2px"
        borderColor="rgba(255,255,255,0.14)"
        bg="rgba(249,227,26,0.06)"
        w={{ base: "full", md: "360px" }}
      >
        <Card.Header pb={2}>
          <Text fontSize="9px" fontWeight="black" letterSpacing="widest" textTransform="uppercase" color="#f9e31a">
            Entry Point
          </Text>
        </Card.Header>
        <Card.Body pt={0}>
          <Text fontFamily="mono" fontSize="sm" fontWeight="bold">
            {entryLabel}
          </Text>
        </Card.Body>
      </Card.Root>

      {hasNodes ? <Box w="2px" h={8} bg="rgba(249,227,26,0.55)" boxShadow="0 0 8px rgba(249,227,26,0.35)" /> : null}
    </VStack>
  );
}

