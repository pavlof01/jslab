"use client";

import { Box, HStack, Text } from "@chakra-ui/react";
import { FaCircleExclamation, FaArrowRight, FaPhone } from "react-icons/fa6";

export type KeyEventType = "assert" | "typeConversion" | "methodCall" | "critical";

export function KeyEventAnnotation({ text, type, nodeDepth }: { text: string; type: KeyEventType; nodeDepth: number }) {
  const typeConfig = {
    assert: {
      icon: FaCircleExclamation,
      color: "#fbbf24",
      bg: "rgba(251,191,36,0.1)",
      border: "rgba(251,191,36,0.3)",
      label: "Assert",
    },
    typeConversion: {
      icon: FaArrowRight,
      color: "#60a5fa",
      bg: "rgba(96,165,250,0.1)",
      border: "rgba(96,165,250,0.3)",
      label: "Type Conversion",
    },
    methodCall: {
      icon: FaPhone,
      color: "#f472b6",
      bg: "rgba(244,114,182,0.1)",
      border: "rgba(244,114,182,0.3)",
      label: "Method Call",
    },
    critical: {
      icon: FaCircleExclamation,
      color: "#f87171",
      bg: "rgba(248,113,113,0.1)",
      border: "rgba(248,113,113,0.3)",
      label: "Critical",
    },
  };

  const config = typeConfig[type];
  const IconComponent = config.icon;

  return (
    <Box pl={nodeDepth * 12} py={1}>
      <HStack
        gap={2}
        px={3}
        py={2}
        borderRadius="0.375rem"
        bg={config.bg}
        borderWidth="1px"
        borderColor={config.border}
        w={{ base: "full", md: "520px" }}
      >
        <Box flexShrink={0} color={config.color}>
          <IconComponent size={13} />
        </Box>
        <Text fontSize="xs" fontFamily="mono" opacity={0.9} fontWeight="500">
          {text}
        </Text>
      </HStack>
    </Box>
  );
}
