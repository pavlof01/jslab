"use client";

import { Box, Button, Container, Flex, Grid, Text } from "@chakra-ui/react";
import { useState } from "react";

import { QuietLink } from "@/components/ui";

import { INTRINSICS } from "../landing-data";
import { SectionHead } from "./SectionHead";

export function IntrinsicsSection() {
  const [selected, setSelected] = useState(0);
  const [signature, explanation] = INTRINSICS[selected];

  return (
    <Box layerStyle="section" as="section" id="intrinsics" scrollMarginTop="64px">
      <Container maxW="1280px" px={{ base: 4, md: "clamp(16px, 4vw, 56px)" }}>
        <SectionHead
          number="02"
          label="intrinsics"
          heading="V8 tests itself with percent-prefixed natives. The Playground lets you call them."
          lede="Force a tier, read the optimisation status back, print an object's internal layout."
        />

        <Box layerStyle="panel" mb={{ base: 10, md: "96px" }}>
          <Flex
            textStyle="label"
            wrap="wrap"
            align="center"
            justify="space-between"
            gap="10px 20px"
            px={{ base: "14px", md: "20px" }}
            py="11px"
            borderBottomWidth="1px"
            borderColor="rule.structural"
            bg="surface.band"
            color="ink.label"
          >
            <Text>
              V8 intrinsics ·{" "}
              <Text as="span" color="ink.1" textTransform="none" letterSpacing="0.02em">
                --allow-natives-syntax
              </Text>
            </Text>
            <Text>V8 only</Text>
          </Flex>

          <Grid
            templateColumns="repeat(auto-fit, minmax(min(100%, 300px), 1fr))"
            gap="1px"
            bg="rule.structural"
          >
            <Flex direction="column" gap="16px" bg="surface.panel" p={{ base: 5, md: "26px" }}>
              <Flex wrap="wrap" gap="8px 10px">
                {INTRINSICS.map(([name], i) => (
                  <Button
                    key={name}
                    variant="ghost"
                    typeface="code"
                    active={i === selected}
                    onClick={() => setSelected(i)}
                    maxW="100%"
                    overflowWrap="anywhere"
                  >
                    {name.replace(/\(.*\)/, "()")}
                  </Button>
                ))}
              </Flex>
            </Flex>

            <Flex direction="column" gap="12px" bg="surface.band" p={{ base: 5, md: "26px" }}>
              <Text textStyle="codeLg" color="accent" wordBreak="break-word">
                {signature}
              </Text>
              <Text textStyle="body" color="ink.2" maxW="48ch" textWrap="pretty">
                {explanation}
              </Text>
              <QuietLink href="/playground" mono mt="auto" display="inline-block" fontSize="12.5px">
                open the Playground →
              </QuietLink>
            </Flex>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
}
