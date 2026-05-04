"use client";

import React, { useEffect } from "react";
import { HStack, Input, NativeSelect, Text, VStack, For, Tag, Button } from "@chakra-ui/react";

const PRESETS = [
  "42",
  '"42"',
  '"hello"',
  "true",
  "false",
  "null",
  "undefined",
  "Symbol()",
  "42n",
  "{}",
  '{ valueOf: () => "1" }',
  "[]",
];

type Props = {
  selectedAlgo: string;
  onAlgoChange?: (val: string) => void;
  userInputRaw: string;
  onInputChange?: (val: string) => void;
  onInputCommit?: (val: string) => void;
};

const EntryPointSection: React.FC<Props> = ({
  selectedAlgo,
  onAlgoChange,
  userInputRaw,
  onInputChange,
  onInputCommit,
}) => {
  const interactive = !!onInputChange;
  const [algoOptions, setAlgoOptions] = React.useState<string[]>([]);

  useEffect(() => {
    fetch("/api/trace/functions")
      .then((r) => r.json())
      .then((data: { available_functions?: string[] }) => {
        if (Array.isArray(data.available_functions)) setAlgoOptions(data.available_functions);
      })
      .catch(() => {});
  }, []);

  return (
    <VStack align="stretch" gap={0} mb={3}>
      <HStack
        gap={0}
        px="6px"
        py="6px"
        borderRadius="sm"
        bg="rgba(249,227,26,0.04)"
        border="1px solid rgba(249,227,26,0.12)"
        align="center"
      >
        <NativeSelect.Root
          disabled={algoOptions.length === 0 || !interactive}
          size="sm"
          variant="plain"
          w="auto"
          flexShrink={0}
          bg="rgba(249,227,26,0.08)"
          border="1px solid rgba(249,227,26,0.35)"
          borderRadius="md"
          px={2}
          _hover={{ bg: "rgba(249,227,26,0.13)", borderColor: "rgba(249,227,26,0.6)" }}
          transition="all 0.15s"
        >
          <NativeSelect.Field
            value={selectedAlgo}
            onChange={(e) => onAlgoChange?.(e.target.value)}
            fontWeight="bold"
            color="#f9e31a"
            outline="none"
            cursor="pointer"
            px={0}
            w="auto"
          >
            {algoOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>

        <Text fontSize="20px" color="rgba(148,163,184,0.6)" flexShrink={0} mx="4px">
          (
        </Text>

        <Input
          value={userInputRaw}
          onChange={(e) => onInputChange?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onInputCommit?.(userInputRaw);
          }}
          onBlur={() => onInputCommit?.(userInputRaw)}
          fontSize="14px"
          size="sm"
          flex="1"
          minW={0}
          bg="rgba(255,255,255,0.06)"
          borderColor="rgba(255,255,255,0.18)"
          color="rgba(226,232,240,1)"
          _hover={{ borderColor: "rgba(255,255,255,0.3)" }}
          _focus={{
            borderColor: "rgba(249,227,26,0.6)",
            boxShadow: "0 0 0 1px rgba(249,227,26,0.25)",
            bg: "rgba(255,255,255,0.08)",
          }}
          placeholder='42, "hello", {}'
        />

        <Text fontSize="20px" color="rgba(148,163,184,0.6)" flexShrink={0} mx="4px">
          )
        </Text>
      </HStack>

      <HStack gap="5px" flexWrap="wrap" px="6px" pt="8px">
        <Text fontSize="9px" color="rgba(100,116,139,1)" flexShrink={0} mr="2px">
          examples:
        </Text>
        <For each={PRESETS}>
          {(preset) => (
            <Tag.Root asChild key={preset}>
              <Button
                variant="outline"
                size="2xs"
                fontSize="10px"
                onClick={() => {
                  onInputChange?.(preset);
                  onInputCommit?.(preset);
                }}
              >
                <Tag.Label>{preset}</Tag.Label>
              </Button>
            </Tag.Root>
          )}
        </For>
      </HStack>
    </VStack>
  );
};

export default EntryPointSection;
