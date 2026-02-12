"use client";

import Image from "next/image";
import { Badge, Button, HStack, Text, IconButton, Box } from "@chakra-ui/react";
import { CiPlay1 } from "react-icons/ci";
import { FaGithubSquare } from "react-icons/fa";

import type { EngineKey, RunStatus } from "../../lib/types";
import { useEngineOutputsState } from "@/store/useEngineOutputs";
import { useColorModeValue } from "../ui/color-mode";

const MY_GH = "https://github.com/pavlof01";

const statusColor: Record<RunStatus, string> = {
  idle: "gray",
  running: "blue",
  done: "green",
  error: "red",
} as const;

export function HeaderBar() {
  const { status } = useEngineOutputsState();

  const panelBg = useColorModeValue("#ffffff", "#1e293b");
  const borderColor = useColorModeValue("#e2e8f0", "#334155");

  const handlePressGitHub = () => {
    window.open(MY_GH, "_blank");
  };

  return (
    <Box as="header" px={6} py={4} height="8vh" borderBottom="1px solid" borderColor={borderColor} bg={panelBg}>
      <HStack align="center" justify="space-between" gap={4} w="full" flexWrap="wrap">
        <HStack align="center" gap={4} flexWrap="wrap">
          <HStack align="center" gap={3}>
            <Image src="/jslab-logo-transparent.png" alt="JSLab" width={40} height={40} priority />
          </HStack>
        </HStack>
        <HStack gap={4} align="center">
          <Badge colorScheme={statusColor[status]} textTransform="capitalize" px={3} py={1} borderRadius="md">
            {status}
          </Badge>
          <IconButton aria-label="github" onClick={handlePressGitHub} variant="plain">
            <FaGithubSquare size={32} />
          </IconButton>
        </HStack>
      </HStack>
    </Box>
  );
}
