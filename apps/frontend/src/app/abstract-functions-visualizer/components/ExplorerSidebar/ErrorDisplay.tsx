"use client";

import { Box, Show, Text } from "@chakra-ui/react";

export function ErrorDisplay({ error }: { error: string | null }) {
  return (
    <Show when={!!error}>
      <Box borderWidth="1px" borderColor="red.solid" borderRadius="md" p={3} bg="red.subtle">
        <Text fontWeight="semibold" mb={1}>
          Runner error
        </Text>
        <Text fontSize="sm" opacity={0.9}>
          {error}
        </Text>
      </Box>
    </Show>
  );
}
