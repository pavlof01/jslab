import { Box, Container, Flex, Text } from "@chakra-ui/react";

import IntrinsicsExplorer from "./IntrinsicsExplorer";
import SectionHead from "./SectionHead";

const IntrinsicsSection: React.FC = () => {
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

          <IntrinsicsExplorer />
        </Box>
      </Container>
    </Box>
  );
};

export default IntrinsicsSection;
