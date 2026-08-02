import { Box, Container, Heading, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import Link from "next/link";

import { tools } from "@/lib/tools";

const displayFont = "'Plus Jakarta Sans', Inter, var(--font-sans), sans-serif";
const cardBorder = "rgba(255,255,255,0.1)";
const mutedText = "rgba(255,255,255,0.62)";

export function ToolsSection() {
  return (
    <Box as="section" px={{ base: 4, sm: 6, md: 20 }} py={{ base: 12, sm: 16, md: 20 }}>
      <Container maxW="7xl" px={0}>
        <VStack gap={{ base: 10, md: 12 }} align="stretch">
          <VStack gap={4} textAlign="center">
            <Text color="brand.300" fontSize="xs" fontWeight="700" letterSpacing="0.3em" textTransform="uppercase">
              The Toolbox
            </Text>
            <Heading
              as="h2"
              fontFamily={displayFont}
              fontSize={{ base: "2xl", md: "4xl" }}
              fontWeight="900"
              letterSpacing="-0.04em"
            >
              Everything Shipped So Far
            </Heading>
            <Text color={mutedText} fontSize="base" lineHeight="1.8" maxW="2xl">
              Six tools, all free and open source, all running the real engine binaries or the real spec text.
            </Text>
          </VStack>

          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={6}>
            {tools.map((tool) => (
              <Box
                key={tool.href}
                asChild
                display="flex"
                minH="100%"
                flexDirection="column"
                borderWidth="1px"
                borderColor={cardBorder}
                borderRadius="2xl"
                bg="surface.100"
                p={{ base: 6, md: 8 }}
                transition="transform 0.2s ease, border-color 0.2s ease"
                _hover={{ borderColor: "rgba(249,227,26,0.3)", transform: "translateY(-4px)" }}
              >
                <Link href={tool.href}>
                  <Heading as="h3" fontFamily={displayFont} fontSize="xl" fontWeight="800" mb={2}>
                    {tool.label}
                  </Heading>
                  <Text color={mutedText} fontSize="sm" lineHeight="1.75">
                    {tool.description}
                  </Text>
                </Link>
              </Box>
            ))}
          </SimpleGrid>
        </VStack>
      </Container>
    </Box>
  );
}
