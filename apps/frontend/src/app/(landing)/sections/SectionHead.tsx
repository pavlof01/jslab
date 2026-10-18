import { Box, Flex, Text } from "@chakra-ui/react";

type SectionHeadProps = {
  number: string;
  label: string;
  heading: string;
  lede?: string;
};

const SectionHead: React.FC<SectionHeadProps> = ({ number, label, heading, lede }) => {
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
};

export default SectionHead;
