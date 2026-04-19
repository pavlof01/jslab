import type { IconType } from "react-icons";
import { FaProjectDiagram } from "react-icons/fa";
import { FaRegCirclePlay } from "react-icons/fa6";
import { PiBracketsCurlyBold } from "react-icons/pi";
import { Box, Container, Flex, Heading, SimpleGrid, Text, VStack } from "@chakra-ui/react";

const displayFont = "'Plus Jakarta Sans', Inter, var(--font-sans), sans-serif";
const subtleBorder = "rgba(255,255,255,0.08)";
const cardBorder = "rgba(255,255,255,0.1)";
const mutedText = "rgba(255,255,255,0.62)";

const methodologySteps: Array<{ icon: IconType; title: string; description: string }> = [
  {
    icon: PiBracketsCurlyBold,
    title: "1. Specification Parsing",
    description: "Automated ingestion of ECMA-262 standards into machine-readable data structures.",
  },
  {
    icon: FaProjectDiagram,
    title: "2. Logic Mapping",
    description: "Translating abstract prose into high-fidelity reactive flowcharts and state machines.",
  },
  {
    icon: FaRegCirclePlay,
    title: "3. Runtime Tracing",
    description: "Real-time tracking of internal method calls, environment records, and memory states.",
  },
];

export function MethodologySection() {
  return (
    <Box
      as="section"
      position="relative"
      borderTopWidth="1px"
      borderColor={subtleBorder}
      bg="surface.100"
      px={{ base: 4, sm: 6, md: 20 }}
      py={{ base: 12, sm: 16, md: 20 }}
    >
      <Container maxW="7xl" px={0}>
        <VStack gap={{ base: 10, md: 12 }} align="stretch">
          <VStack gap={4} textAlign="center">
            <Text color="brand.300" fontSize="xs" fontWeight="700" letterSpacing="0.3em" textTransform="uppercase">
              The Methodology
            </Text>
            <Heading
              as="h2"
              fontFamily={displayFont}
              fontSize={{ base: "2xl", md: "4xl" }}
              fontWeight="900"
              letterSpacing="-0.04em"
            >
              From Spec Text to Visual Flow
            </Heading>
            <Text color={mutedText} fontSize="base" lineHeight="1.8" maxW="2xl">
              We transform complex ECMAScript prose into executable models that reveal internal JavaScript behavior.
            </Text>
          </VStack>

          <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
            {methodologySteps.map((step) => (
              <Box
                key={step.title}
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
                <Flex
                  mb={6}
                  h={12}
                  w={12}
                  align="center"
                  justify="center"
                  borderRadius="xl"
                  bg="brandAlpha.100"
                  color="brand.300"
                >
                  <step.icon size={24} />
                </Flex>
                <Heading as="h3" fontFamily={displayFont} fontSize="xl" fontWeight="800" mb={2}>
                  {step.title}
                </Heading>
                <Text color={mutedText} fontSize="sm" lineHeight="1.75" mb={6}>
                  {step.description}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </VStack>
      </Container>
    </Box>
  );
}
