"use client";

import Link from "next/link";
import { Box, Container, Heading, Stack, Text, Button } from "@chakra-ui/react";
import { LooseEqualityPlayground } from "@/components/OutputsPanel/LooseEqualityPlayground";
import { useColorModeValue } from "@/components/ui/color-mode";

export default function LooseEqualityPage() {
  const pageBg = useColorModeValue("#f8fafc", "#0f172a");
  const panelBg = useColorModeValue("#ffffff", "#1e293b");
  const borderColor = useColorModeValue("#e2e8f0", "#334155");
  const textPrimary = useColorModeValue("#0f172a", "#e2e8f0");

  return (
    <Box bg={pageBg} color={textPrimary} minH="100vh" py={8}>
      <Container maxW="6xl">
        <Stack direction="row" align="center" justify="space-between" mb={6}>
          <Stack gap={1}>
            <Heading size="lg">Loose Equality Visualizer</Heading>
            <Text color="gray.500" maxW="3xl">
              Interactive walkthrough of the Abstract Equality Comparison (==) with type coercions, recursion, and spec
              anchors.
            </Text>
          </Stack>
          <Link href="/">Back to runner</Link>
        </Stack>

        <Box bg={panelBg} border="1px solid" borderColor={borderColor} borderRadius="lg" shadow="md">
          <LooseEqualityPlayground />
        </Box>
      </Container>
    </Box>
  );
}
