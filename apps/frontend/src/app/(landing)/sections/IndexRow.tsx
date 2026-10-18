import { Box, Flex, Text } from "@chakra-ui/react";
import Link from "next/link";

type Props = {
  n: string;
  href: string;
  name: string;
  kind: string;
  desc: string;
  nameSize?: string;
  external?: boolean;
};

const IndexRow: React.FC<Props> = ({
  n,
  href,
  name,
  kind,
  desc,
  nameSize = "17px",
  external = false,
}) => {
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
};

export default IndexRow;
