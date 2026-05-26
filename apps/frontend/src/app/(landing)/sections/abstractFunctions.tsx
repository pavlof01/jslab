import { Box, Container, Heading, Text, VStack } from "@chakra-ui/react";
import type { VisualizerInitialData } from "@/app/abstract-functions-visualizer/model";
import { AbstractFunctionsDemo } from "./AbstractFunctionsDemo";

const displayFont = "'Plus Jakarta Sans', Inter, var(--font-sans), sans-serif";
const subtleBorder = "rgba(255,255,255,0.08)";
const mutedText = "rgba(255,255,255,0.62)";

export function AbstractFunctionsSection({ initialData }: { initialData?: VisualizerInitialData }) {
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
          bg="glow.blue"
          filter="blur(120px)"
        />
        <Box
          position="absolute"
          bottom="10%"
          left="-6rem"
          h="18rem"
          w="18rem"
          borderRadius="full"
          bg="glow.orange"
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

          <AbstractFunctionsDemo initialData={initialData} />
        </VStack>
      </Container>
    </Box>
  );
}
