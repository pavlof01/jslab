"use client";

import { HStack, Text, VStack } from "@chakra-ui/react";
import { LuExternalLink } from "react-icons/lu";
import type { NavItem } from "./nav.types";

type Props = {
  item: NavItem;
};

export const NavItemBody: React.FC<Props> = ({ item }) => {
  return (
    <VStack align="start" gap={1} width="full">
      <HStack justify="space-between" width="full" gap={3}>
        <Text fontSize="sm" fontWeight="700">
          {item.label}
        </Text>
        {item.external ? <LuExternalLink size={14} /> : null}
      </HStack>
      <Text fontSize="xs" lineHeight="1.6" color="whiteAlpha.600" textAlign="left" whiteSpace="normal">
        {item.description}
      </Text>
    </VStack>
  );
};
