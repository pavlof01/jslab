import { Flex, Box, Text } from "@chakra-ui/react";

import { type Token } from "../lib/tokenize";

const TOKEN_COLOR: Record<string, string> = {
  Keyword: "#f9e31a",
  Identifier: "rgba(255,255,255,0.92)",
  NumericLiteral: "#66d9e8",
  StringLiteral: "#a8e267",
  TemplateLiteral: "#a8e267",
  RegExpLiteral: "#ff9f43",
  Operator: "#ff6b6b",
  Punctuator: "rgba(255,255,255,0.45)",
  LineComment: "rgba(255,255,255,0.28)",
  BlockComment: "rgba(255,255,255,0.28)",
};

const TokensPane: React.FC<{ tokens: Token[] }> = ({ tokens }) => {
  if (tokens.length === 0) {
    return (
      <Flex h="60%" align="center" justify="center">
        <Text color="whiteAlpha.200" fontSize="sm">
          No tokens found
        </Text>
      </Flex>
    );
  }
  return (
    <Box p={4} overflowX="auto">
      <Box as="table" w="100%" fontSize="12px" style={{ borderCollapse: "collapse" }}>
        <Box as="thead">
          <Box as="tr">
            {["#", "Kind", "Value"].map((h) => (
              <Box
                key={h}
                as="th"
                textAlign="left"
                p="4px 10px"
                color="whiteAlpha.300"
                fontSize="10px"
                fontWeight="700"
                letterSpacing="0.12em"
                textTransform="uppercase"
                borderBottom="1px solid rgba(255,255,255,0.06)"
              >
                {h}
              </Box>
            ))}
          </Box>
        </Box>
        <Box as="tbody">
          {tokens.map((tok, i) => (
            <Box key={i} as="tr" _hover={{ bg: "rgba(255,255,255,0.025)" }}>
              <Box as="td" p="3px 10px" color="whiteAlpha.250" w="48px" flexShrink={0}>
                {i + 1}
              </Box>
              <Box as="td" p="3px 10px" w="160px">
                <Box
                  as="span"
                  px={1.5}
                  py="1px"
                  borderRadius="sm"
                  fontSize="11px"
                  bg="surface.200"
                  color={TOKEN_COLOR[tok.kind] ?? "whiteAlpha.600"}
                >
                  {tok.kind}
                </Box>
              </Box>
              <Box
                as="td"
                p="3px 10px"
                color={TOKEN_COLOR[tok.kind] ?? "whiteAlpha.700"}
                maxW="320px"
                overflow="hidden"
                style={{ textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {tok.value.length > 80 ? tok.value.slice(0, 77) + "…" : tok.value}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default TokensPane;
