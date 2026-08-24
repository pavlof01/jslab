import { Box, Flex, Text } from "@chakra-ui/react";
import Link from "next/link";

export function SectionHead({
  number,
  label,
  heading,
  lede,
}: {
  number: string;
  label: string;
  heading: string;
  lede?: string;
}) {
  return (
    <Flex
      wrap="wrap"
      gap={{ base: 4, md: "clamp(18px, 4vw, 56px)" }}
      pt={{ base: 11, md: "104px" }}
      pb={{ base: 6, md: "44px" }}
    >
      <Box flex="0 0 auto" w="120px">
        <Box w="22px" h="2px" bg="accent" mb="13px" />
        <Text textStyle="label" color="ink.label">
          {number} · {label}
        </Text>
      </Box>
      <Box flex="1 1 620px" minW={0}>
        <Text
          as="h2"
          m={0}
          fontSize={{ base: "25px", md: "clamp(28px, 3.3vw, 40px)" }}
          lineHeight="1.05"
          fontWeight="700"
          letterSpacing="-0.028em"
          textWrap="balance"
        >
          {heading}
        </Text>
        {lede && (
          <Text
            mt="16px"
            mb={0}
            fontSize={{ base: "15.5px", md: "clamp(16px, 1.2vw, 17.5px)" }}
            lineHeight="1.55"
            color="ink.2"
            maxW="62ch"
            textWrap="pretty"
          >
            {lede}
          </Text>
        )}
      </Box>
    </Flex>
  );
}

export function IndexRow({
  n,
  href,
  name,
  kind,
  desc,
  nameSize = "17px",
  external = false,
}: {
  n: string;
  href: string;
  name: string;
  kind: string;
  desc: string;
  nameSize?: string;
  external?: boolean;
}) {
  return (
    <Link href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
      <Box
        display="grid"
        gridTemplateColumns="34px 1fr"
        columnGap="14px"
        rowGap="6px"
        alignItems="start"
        px="6px"
        py={{ base: 4, md: "18px" }}
        borderTopWidth="1px"
        borderColor="rule.list"
        color="ink.1"
        transition="background 140ms ease, color 140ms ease"
        _hover={{ bg: "surface.panel", color: "accent" }}
      >
        <Text textStyle="codeSm" color="ink.4" pt="4px">
          {n}
        </Text>
        <Box>
          <Flex wrap="wrap" align="baseline" justify="space-between" gap="4px 14px">
            <Text fontSize={nameSize} fontWeight="600" letterSpacing="-0.015em" color="inherit">
              {name}
            </Text>
            <Text textStyle="label" color="ink.4">
              {kind}
            </Text>
          </Flex>
          <Text
            mt="7px"
            fontSize={{ base: "14.5px", md: "15px" }}
            lineHeight="1.5"
            color="ink.2"
            maxW="46ch"
            textWrap="pretty"
          >
            {desc}
          </Text>
        </Box>
      </Box>
    </Link>
  );
}
