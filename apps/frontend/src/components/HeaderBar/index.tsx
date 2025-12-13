"use client";

import Image from "next/image";
import { Badge, HStack, IconButton } from "@chakra-ui/react";
import { FaGithubSquare } from "react-icons/fa";

import type { RunStatus } from "../../lib/types";
import Link from "next/link";

const MY_GH = "https://github.com/pavlof01";

const statusColor: Record<RunStatus, string> = {
  idle: "gray",
  running: "blue",
  done: "green",
  error: "red",
} as const;

interface HeaderBarProps {
  status: RunStatus;
}

export function HeaderBar({ status }: HeaderBarProps) {
  const handlePressGitHub = () => {
    window.open(MY_GH, "_blank");
  };

  return (
    <HStack align="center" justify="space-between" gap={4} w="full" flexWrap="wrap">
      <HStack align="center" gap={4} flexWrap="wrap">
        <HStack align="center" gap={3}>
          <Image src="/jslab-logo-transparent.png" alt="JSLab" width={40} height={40} priority />
        </HStack>
      </HStack>
      <Link href="/loose-equality">Loose Equality Visualizer</Link>
      <Link href="/arithmetic-operations">EvaluateString Or Numeric Binary Expression</Link>
      <HStack gap={4} align="center">
        <Badge colorScheme={statusColor[status]} textTransform="capitalize" px={3} py={1} borderRadius="md">
          {status}
        </Badge>
        <IconButton aria-label="github" onClick={handlePressGitHub} variant="plain">
          <FaGithubSquare size={32} />
        </IconButton>
      </HStack>
    </HStack>
  );
}
