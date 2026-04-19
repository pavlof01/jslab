import { FaBolt } from "react-icons/fa";
import { Box, Button, Container, Flex, Heading, Text, VStack } from "@chakra-ui/react";
import Link from "next/link";

const displayFont = "'Plus Jakarta Sans', Inter, var(--font-sans), sans-serif";

export function ReadyToDebugSection() {
  return (
    <Box as="section" px={{ base: 4, sm: 6, md: 20 }} py={{ base: 16, sm: 20, md: 24 }}>
      <Container maxW="4xl" px={0}>
        <Box
          position="relative"
          overflow="hidden"
          borderRadius={{ base: "2rem", md: "2.5rem" }}
          bg="brand.300"
          color="brand.800"
          px={{ base: 6, sm: 8, md: 16 }}
          py={{ base: 8, sm: 10, md: 16 }}
          textAlign="center"
          boxShadow="0 30px 60px -15px rgba(249,227,26,0.3)"
        >
          <Box
            aria-hidden="true"
            position="absolute"
            top="-5rem"
            right="-3rem"
            h="14rem"
            w="14rem"
            borderRadius="full"
            bg="navSurface.50"
            filter="blur(48px)"
          />

          <VStack gap={6} position="relative">
            <Heading
              as="h2"
              fontFamily={displayFont}
              fontSize={{ base: "1.9rem", sm: "2.2rem", md: "3.5rem" }}
              fontWeight="900"
              letterSpacing="-0.05em"
              lineHeight="1.05"
            >
              Ready to debug the specification?
            </Heading>

            <Text maxW="xl" fontSize={{ base: "md", md: "lg" }} fontWeight="600" opacity={0.72}>
              Join developers and engine contributors using JSLab to master the language.
            </Text>

            <Flex direction={{ base: "column", sm: "row" }} gap={4} justify="center" w="full">
              <Button
                asChild
                h="auto"
                width={{ base: "full", sm: "auto" }}
                borderRadius="xl"
                bg="brand.800"
                color="white"
                fontSize="md"
                fontWeight="800"
                px={{ base: 6, md: 8 }}
                py={4}
                _hover={{ opacity: 0.92 }}
              >
                <Link
                  href="/abstract-functions-visualizer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem" }}
                >
                  Launch Explorer
                  <FaBolt />
                </Link>
              </Button>
            </Flex>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
}
