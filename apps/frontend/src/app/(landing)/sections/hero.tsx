import { BsRocketTakeoff } from "react-icons/bs";
import { Box, Button, Container, Heading, Text, VStack } from "@chakra-ui/react";
import Link from "next/link";

const displayFont = "'Plus Jakarta Sans', Inter, var(--font-sans), sans-serif";
const mutedText = "rgba(255,255,255,0.62)";

export function HeroSection() {
  return (
    <Box
      as="section"
      position="relative"
      px={{ base: 4, sm: 6, md: 8 }}
      pt={{ base: 12, sm: 16, md: 24 }}
      pb={{ base: 16, sm: 20, md: 24 }}
      textAlign="center"
    >
      <Container maxW="full" px={0}>
        <VStack gap={{ base: 8, md: 10 }}>
          <Box
            borderWidth="1px"
            borderColor="rgba(255,255,255,0.12)"
            bg="surface.200"
            borderRadius="full"
            px={4}
            py={2}
            backdropFilter="blur(16px)"
          >
            <Text
              color="whiteAlpha.800"
              fontSize="xs"
              fontWeight="700"
              letterSpacing="0.28em"
              textTransform="uppercase"
            >
              Interactive ECMAScript Explorer
            </Text>
          </Box>

          <Heading
            as="h1"
            fontFamily={displayFont}
            fontSize={{ base: "2.75rem", sm: "3.5rem", md: "clamp(3.5rem, 7.3vw, 12rem)" }}
            fontWeight="900"
            letterSpacing="-0.05em"
            lineHeight={{ base: "0.98", md: "1.02" }}
            maxW="full"
            width="full"
          >
            Understand the Engine.
            <br />
            <Text as="span" color="brand.300">
              Explore the Spec.
            </Text>
          </Heading>

          <Text color={mutedText} fontSize={{ base: "sm", sm: "md", md: "lg" }} lineHeight="1.8" maxW="2xl">
            Move from ECMA prose to visual execution traces, inspect abstract operations, and see how runtime behavior
            unfolds step by step.
          </Text>

          <Button
            asChild
            colorPalette="brand"
            variant="solid"
            h="auto"
            borderRadius="xl"
            boxShadow="0 10px 40px -10px rgba(249,227,26,0.3)"
            width={{ base: "full", sm: "auto" }}
            fontSize={{ base: "md", sm: "lg", md: "xl" }}
            fontWeight="800"
            px={{ base: 6, sm: 8, md: 12 }}
            py={{ base: 4, md: 5 }}
            transition="transform 0.2s ease, opacity 0.2s ease"
            _hover={{ opacity: 0.92, transform: "translateY(-2px)" }}
          >
            <Link href="/playground" style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem" }}>
              Get Started Free
              <BsRocketTakeoff />
            </Link>
          </Button>
        </VStack>
      </Container>
    </Box>
  );
}
