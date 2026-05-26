"use client";

import React from "react";
import { HStack, Box, Text } from "@chakra-ui/react";
import Link from "next/link";
import { CATEGORY_ROUTES, type AlgoCategory } from "@/app/abstract-functions-visualizer/store";

const TABS: { id: AlgoCategory; label: string }[] = [
  { id: "typeConversion", label: "Type Conversion" },
  { id: "equality", label: "Equality Operators" },
];

type Props = {
  category: AlgoCategory;
};

export const CategoryTabs: React.FC<Props> = ({ category }) => {
  return (
    <HStack gap="2px" mb={2} borderBottom="1px solid rgba(255,255,255,0.08)">
      {TABS.map((tab) => {
        const active = tab.id === category;
        return (
          <Box
            key={tab.id}
            asChild
            px="14px"
            py="8px"
            cursor="pointer"
            position="relative"
            transition="all 120ms"
            borderBottom="2px solid"
            borderColor={active ? "#f9e31a" : "transparent"}
            _hover={{ bg: active ? "transparent" : "rgba(255,255,255,0.04)" }}
          >
            <Link href={CATEGORY_ROUTES[tab.id]}>
              <Text
                fontSize="11px"
                fontWeight={active ? "bold" : "medium"}
                letterSpacing="0.04em"
                color={active ? "#f9e31a" : "rgba(148,163,184,0.8)"}
                textTransform="uppercase"
              >
                {tab.label}
              </Text>
            </Link>
          </Box>
        );
      })}
    </HStack>
  );
};
