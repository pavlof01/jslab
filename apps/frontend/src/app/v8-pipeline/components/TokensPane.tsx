import { Box, Flex, Text } from "@chakra-ui/react";

import { type Token } from "../lib/tokenize";

const TOKEN_COLOR: Record<string, string> = {
  Keyword: "syn.keyword",
  Identifier: "ink.code",
  NumericLiteral: "syn.number",
  StringLiteral: "syn.string",
  TemplateLiteral: "syn.string",
  RegExpLiteral: "syn.string",
  Operator: "ink.2",
  Punctuator: "ink.4",
  LineComment: "syn.comment",
  BlockComment: "syn.comment",
};
const TokensPane: React.FC<{ tokens: Token[] }> = ({ tokens }) => {
  if (tokens.length === 0) {
    return (
      <Flex h="60%" align="center" justify="center">
        <Text color="rule.row" fontSize="sm">
          No tokens found
        </Text>
      </Flex>
    );
  }
  return (
    <Box p={4} overflowX="auto">
      <Box as="table" w="100%" fontSize="12px" borderCollapse="collapse">
        <Box as="thead">
          <Box as="tr">
            {["#", "Kind", "Value"].map((h) => (
              <Box
                key={h}
                as="th"
                textAlign="left"
                p="4px 10px"
                textStyle="labelSm"
                fontWeight="700"
                color="ink.6"
                borderBottom="1px solid rgba(255,255,255,0.06)"
              >
                {h}
              </Box>
            ))}
          </Box>
        </Box>
        <Box as="tbody">
          {tokens.map((tok, i) => (
            <Box
              key={`${tok.start}-${tok.kind}`}
              as="tr"
              _hover={{ bg: "rgba(255,255,255,0.025)" }}
            >
              <Box as="td" p="3px 10px" color="ink.6" w="48px" flexShrink={0}>
                {i + 1}
              </Box>
              <Box as="td" p="3px 10px" w="160px">
                <Box
                  as="span"
                  px={1.5}
                  py="1px"
                  borderRadius="sm"
                  fontSize="11px"
                  bg="surface.band"
                  color={TOKEN_COLOR[tok.kind] ?? "ink.3"}
                >
                  {tok.kind}
                </Box>
              </Box>
              <Box
                as="td"
                p="3px 10px"
                color={TOKEN_COLOR[tok.kind] ?? "ink.code"}
                maxW="320px"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
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
