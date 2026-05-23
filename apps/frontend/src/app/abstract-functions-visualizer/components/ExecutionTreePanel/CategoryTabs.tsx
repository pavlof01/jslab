"use client";

import React from "react";
import { HStack, Box, Text } from "@chakra-ui/react";
import type { AlgoCategory } from "@/app/abstract-functions-visualizer/store";

const TABS: { id: AlgoCategory; label: string }[] = [
  { id: "typeConversion", label: "Type Conversion" },
  { id: "equality", label: "Equality Operators" },
];

type Props = {
  category: AlgoCategory;
  onChange?: (c: AlgoCategory) => void;
};

export const CategoryTabs: React.FC<Props> = ({ category, onChange }) => {
  return (
    <HStack gap="2px" mb={2} borderBottom="1px solid rgba(255,255,255,0.08)">
      {TABS.map((tab) => {
        const active = tab.id === category;
        return (
          <Box
            key={tab.id}
            as="button"
            onClick={() => onChange?.(tab.id)}
            px="14px"
            py="8px"
            cursor="pointer"
            position="relative"
            transition="all 120ms"
            borderBottom="2px solid"
            borderColor={active ? "#f9e31a" : "transparent"}
            _hover={{ bg: active ? "transparent" : "rgba(255,255,255,0.04)" }}
          >
            <Text
              fontSize="11px"
              fontWeight={active ? "bold" : "medium"}
              letterSpacing="0.04em"
              color={active ? "#f9e31a" : "rgba(148,163,184,0.8)"}
              textTransform="uppercase"
            >
              {tab.label}
            </Text>
          </Box>
        );
      })}
    </HStack>
  );
};
