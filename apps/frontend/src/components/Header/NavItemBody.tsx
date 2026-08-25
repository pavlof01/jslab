"use client";

import { Box, HStack, Text, VStack } from "@chakra-ui/react";

import type { NavItem } from "./nav.types";

type Props = {
  item: NavItem;
};

const NavItemBody: React.FC<Props> = ({ item }) => {
  return (
    <VStack
      align="start"
      gap="3px"
      width="full"
      fontFamily="mono"
      textTransform="none"
      letterSpacing="normal"
    >
      <HStack justify="space-between" width="full" gap={3}>
        <Text as="span" fontSize="12.5px" color="ink.1">
          {item.label}
        </Text>
        {item.external ? (
          <Box as="span" aria-hidden="true" fontSize="11px" color="ink.5">
            ↗
          </Box>
        ) : null}
      </HStack>
      <Text
        as="span"
        fontSize="11px"
        lineHeight="1.5"
        color="ink.label"
        textAlign="left"
        whiteSpace="normal"
      >
        {item.description}
      </Text>
    </VStack>
  );
};

export default NavItemBody;
