import { Box, Container, Flex, Grid, Text } from "@chakra-ui/react";

import BytecodePreview from "./hero/BytecodePreview";
import SpecTracePreview from "./hero/SpecTracePreview";

const HeroSection: React.FC = () => {
  return (
    <Box as="section" id="trace" scrollMarginTop="64px" bg="surface.base">
      <Container maxW="1280px" px={{ base: 4, md: "clamp(16px, 4vw, 56px)" }}>
        <Flex
          direction="column"
          align="center"
          textAlign="center"
          pt={{ base: 6, md: "34px" }}
          pb={{ base: 7, md: "44px" }}
        >
          <Text
            as="h1"
            m={0}
            display="flex"
            flexWrap="wrap"
            alignItems="baseline"
            justifyContent="center"
            columnGap="0.4em"
            rowGap="0.1em"
            fontSize={{ base: "24px", md: "clamp(26px, 3vw, 42px)" }}
            lineHeight="1.1"
            fontWeight="700"
            letterSpacing="-0.04em"
          >
            <Text as="span">Read the spec</Text>
            <Text as="span" aria-hidden="true" color="ink.5" fontSize="0.62em" fontWeight="400">
              ⟶
            </Text>
            <Text as="span" textStyle="codeInline" color="ink.code" whiteSpace="nowrap">
              watch it run
              <Box
                as="span"
                display="inline-block"
                w="0.42em"
                h="0.78em"
                ml="0.18em"
                verticalAlign="baseline"
                bg="accent"
                css={{
                  animation: "jsl-blink 1.05s steps(1, end) infinite",
                  "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                }}
              />
            </Text>
          </Text>
        </Flex>

        <Grid
          templateColumns="repeat(auto-fit, minmax(min(100%, 420px), 1fr))"
          alignItems="stretch"
          gap={{ base: 4, md: "22px" }}
        >
          <SpecTracePreview />
          <BytecodePreview />
        </Grid>

        <Box pb={{ base: 10, md: "84px" }} />
      </Container>
    </Box>
  );
};

export default HeroSection;
