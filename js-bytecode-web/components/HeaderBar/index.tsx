"use client";

import Image from "next/image";
import { Badge, Button, HStack, Text } from "@chakra-ui/react";
import type { EngineKey, RunStatus } from "../../lib/types";
import { CiPlay1 } from "react-icons/ci";

const statusColor: Record<RunStatus, string> = {
  idle: "gray",
  running: "blue",
  done: "green",
  error: "red",
} as const;

interface HeaderBarProps {
  onRun: () => void;
  status: RunStatus;
  meta: string;
  versions: Record<EngineKey, string>;
}

export function HeaderBar({ onRun, status, meta }: HeaderBarProps) {
  return (
    <HStack align="center" justify="space-between" gap={4} w="full" flexWrap="wrap">
      <HStack align="center" gap={4} flexWrap="wrap">
        <HStack align="center" gap={3}>
          <Image src="/logo.png" alt="JSLab Bytecode Explorer logo" width={40} height={40} priority />
          <Text fontWeight="semibold" fontSize="lg">
            JSLab Bytecode Explorer
          </Text>
        </HStack>
        <Button
          size="xl"
          w={120}
          bgColor="green.300"
          onClick={onRun}
          loading={status === "running"}
          loadingText="Running"
        >
          <CiPlay1 /> Run
        </Button>
      </HStack>
      <HStack gap={4} align="center">
        <Badge colorScheme={statusColor[status]} textTransform="capitalize" px={3} py={1} borderRadius="md">
          {status}
        </Badge>
      </HStack>
    </HStack>
  );
}
