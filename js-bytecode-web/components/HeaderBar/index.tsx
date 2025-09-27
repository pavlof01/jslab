"use client";

import Image from "next/image";
import { Badge, Button, Checkbox, CheckboxGroup, Fieldset, For, HStack, Tag, Text } from "@chakra-ui/react";
import { ColorModeButton, useColorModeValue } from "../ui/color-mode";
import type { EngineKey, RunStatus } from "../../lib/types";

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
  selectedEngines: EngineKey[];
  onEnginesChange: (values: string[]) => void;
  onlyErrors: boolean;
  onOnlyErrorsChange: (checked: boolean) => void;
  versions: Record<EngineKey, string>;
  tabs: { key: EngineKey; label: string }[];
}

export function HeaderBar({
  onRun,
  status,
  meta,
  selectedEngines,
  onEnginesChange,
  onlyErrors,
  onOnlyErrorsChange,
  versions,
  tabs,
}: HeaderBarProps) {
  const subTextColor = useColorModeValue("#64748b", "#cbd5f5");
  const checkboxBorderColor = useColorModeValue("#94a3b8", "#64748b");

  return (
    <HStack align="center" justify="space-between" gap={4} w="full" flexWrap="wrap">
      <HStack align="center" gap={4} flexWrap="wrap">
        <HStack align="center" gap={3}>
          <Image src="/logo.png" alt="JSLab Bytecode Explorer logo" width={40} height={40} priority />
          <Text fontWeight="semibold" fontSize="lg">
            JSLab Bytecode Explorer
          </Text>
        </HStack>
        <Button colorScheme="blue" onClick={onRun} loading={status === "running"} loadingText="Running">
          Run
        </Button>
        <CheckboxGroup value={selectedEngines} onValueChange={onEnginesChange} name="engines">
          <Fieldset.Root>
            <Fieldset.Content>
              <HStack flexWrap="wrap" gap={3}>
                <For each={tabs}>
                  {(tab) => (
                    <Checkbox.Root
                      key={tab.key}
                      value={tab.key}
                      px={2}
                      py={1}
                      borderRadius="md"
                      border={`1px solid ${checkboxBorderColor}`}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label>{tab.label}</Checkbox.Label>
                    </Checkbox.Root>
                  )}
                </For>
              </HStack>
            </Fieldset.Content>
          </Fieldset.Root>
        </CheckboxGroup>
        <Checkbox.Root
          value="onlyErr"
          checked={onlyErrors}
          onCheckedChange={({ checked }) => onOnlyErrorsChange(checked === true)}
          title="Show only stderr for engines with errors or non-zero exit"
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label>Only stderr on error</Checkbox.Label>
        </Checkbox.Root>
      </HStack>
      <HStack gap={4} align="center">
        <ColorModeButton />
        <Badge colorScheme={statusColor[status]} textTransform="capitalize" px={3} py={1} borderRadius="md">
          {status}
        </Badge>
        {meta && (
          <Text fontSize="sm" color={subTextColor} maxW="220px">
            {meta}
          </Text>
        )}
        <HStack gap={2} align="center">
          <Tag.Root size="sm" borderRadius="full" colorPalette="blue" variant="subtle" title={versions.v8}>
            <Tag.Label>{versions.v8 || "v8"}</Tag.Label>
          </Tag.Root>
          <Tag.Root size="sm" borderRadius="full" colorPalette="purple" variant="subtle" title={versions.sm}>
            <Tag.Label>{versions.sm || "sm"}</Tag.Label>
          </Tag.Root>
          <Tag.Root size="sm" borderRadius="full" colorPalette="orange" variant="subtle" title={versions.hermes}>
            <Tag.Label>{versions.hermes || "hermes"}</Tag.Label>
          </Tag.Root>
          <Tag.Root size="sm" borderRadius="full" colorPalette="teal" variant="subtle" title={versions.jsc}>
            <Tag.Label>{versions.jsc || "jsc"}</Tag.Label>
          </Tag.Root>
        </HStack>
      </HStack>
    </HStack>
  );
}
