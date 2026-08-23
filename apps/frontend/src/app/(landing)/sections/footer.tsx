import Image from "next/image";
import { Box, Container, Flex, Text } from "@chakra-ui/react";

export const FooterSection: React.FC = () => {
  return (
    <Box layerStyle="section" as="footer">
      <Container
        maxW="1280px"
        px={{ base: 4, md: "clamp(16px, 4vw, 56px)" }}
        pt={{ base: 7, md: "44px" }}
        pb={{ base: 10, md: "60px" }}
      >
        <Flex wrap="wrap" align="flex-end" justify="space-between" gap="24px 40px">
          <Box maxW="52ch">
            <Flex align="center" gap={{ base: 3, md: "18px" }}>
              <Image
                src="/jslab-logo.svg"
                alt=""
                width={99}
                height={100}
                unoptimized
                style={{ display: "block", height: "clamp(56px, 6vw, 84px)", width: "auto" }}
              />
              <Text
                fontSize={{ base: "28px", md: "clamp(32px, 4vw, 44px)" }}
                fontWeight="700"
                letterSpacing="-0.04em"
                lineHeight="1"
              >
                JSLab
              </Text>
            </Flex>

            <Text textStyle="bodySm" mt={{ base: 3, md: "16px" }} color="ink.2">
              An open-source project dedicated to making the ECMAScript standard accessible to every developer.
            </Text>
          </Box>

          <Flex direction="column" align={{ base: "flex-start", md: "flex-end" }} gap="10px">
            <a data-jsl="link" href="mailto:pavlof01@gmail.com" style={{ fontFamily: "mono", fontSize: "11.5px" }}>
              ✉ pavlof01@gmail.com
            </a>
            <Text textStyle="codeSm" letterSpacing="0.04em" color="ink.5">
              © 2026 JSLab Project. Not affiliated with ECMA International.
            </Text>
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
};
