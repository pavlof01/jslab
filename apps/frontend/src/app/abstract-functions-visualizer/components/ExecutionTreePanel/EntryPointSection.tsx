"use client";

import React, { useEffect } from "react";
import { HStack, Input, NativeSelect, Text, VStack, For, Tag, Button, Box } from "@chakra-ui/react";
import type { AlgoCategory } from "@/app/abstract-functions-visualizer/store";

const UNARY_PRESETS = [
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

const PRESETS_BY_ALGO: Record<string, string[]> = {
  BinaryExpression: [
    "[] == !{}",
    "{} == ![]",
    "null == undefined",
    '1 == "1"',
    "1 !== 1n",
    "0 == false",
    '"10" < "9"',
    "1 <= 1",
    "1n >= 1",
    "NaN === NaN",
  ],
};

const SUPPORTED_OPERATORS = ["===", "!==", "==", "!=", "<=", ">=", "<", ">"] as const;

function clientDetectOperator(input: string): string | null {
  const len = input.length;
  let i = 0;
  let inString: '"' | "'" | "`" | null = null;
  let depth = 0;
  while (i < len) {
    const ch = input[i];
    if (inString) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === inString) inString = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      i++;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      i++;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      i++;
      continue;
    }
    if (depth === 0) {
      if (input.startsWith("=>", i)) {
        i += 2;
        continue;
      }
      for (const op of SUPPORTED_OPERATORS) {
        if (input.startsWith(op, i)) {
          return op;
        }
      }
    }
    i++;
  }
  return null;
}

type FunctionMetaShape = { category: AlgoCategory; arity: "unary" | "binary"; operator?: string };

type Props = {
  category: AlgoCategory;
  selectedAlgo: string;
  detectedOperator: string | null;
  effectiveAlgoId: string | null;
  onAlgoChange?: (val: string) => void;
  userInputRaw: string;
  onInputChange?: (val: string) => void;
  onInputCommit?: (val: string) => void;
};

const EntryPointSection: React.FC<Props> = ({
  category,
  selectedAlgo,
  detectedOperator,
  effectiveAlgoId,
  onAlgoChange,
  userInputRaw,
  onInputChange,
  onInputCommit,
}) => {
  const interactive = !!onInputChange;
  const [algoOptions, setAlgoOptions] = React.useState<string[]>([]);
  const [functionMeta, setFunctionMeta] = React.useState<Record<string, FunctionMetaShape>>({});

  useEffect(() => {
    fetch("/api/trace/functions")
      .then((r) => r.json())
      .then((data: { available_functions?: string[]; function_meta?: Record<string, FunctionMetaShape> }) => {
        if (Array.isArray(data.available_functions)) setAlgoOptions(data.available_functions);
        if (data.function_meta) setFunctionMeta(data.function_meta);
      })
      .catch(() => {});
  }, []);

  const filteredOptions = algoOptions.filter((name) => {
    const meta = functionMeta[name];
    if (!meta) return category === "typeConversion";
    return meta.category === category;
  });

  const currentMeta = functionMeta[selectedAlgo];
  const isBinary = currentMeta?.arity === "binary" || category === "equality";
  const presets = isBinary ? PRESETS_BY_ALGO[selectedAlgo] ?? PRESETS_BY_ALGO.BinaryExpression : UNARY_PRESETS;
  const placeholder = isBinary ? "e.g. {} == ![]   |   1 !== 1n   |   '10' < '9'" : '42, "hello", {}';

  // Client-side validation for equality tab: must contain a supported operator.
  const clientOperator = isBinary ? clientDetectOperator(userInputRaw) : null;
  const validationError =
    isBinary && userInputRaw.trim().length > 0 && clientOperator === null
      ? "Expression must contain an operator: ==, ===, !=, !==, <, >, <=, >="
      : null;

  return (
    <VStack align="stretch" gap={0} mb={3}>
      <HStack
        gap={0}
        px="6px"
        py="6px"
        borderRadius="sm"
        bg="rgba(249,227,26,0.04)"
        border={validationError ? "1px solid rgba(251,113,133,0.5)" : "1px solid rgba(249,227,26,0.12)"}
        align="center"
      >
        {!isBinary && (
          <NativeSelect.Root
            disabled={filteredOptions.length === 0 || !interactive}
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
              {filteredOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </NativeSelect.Field>
          </NativeSelect.Root>
        )}

        {isBinary && (
          <Box
            flexShrink={0}
            px="10px"
            py="4px"
            mr="6px"
            borderRadius="md"
            bg="rgba(249,227,26,0.08)"
            border="1px solid rgba(249,227,26,0.35)"
          >
            <Text fontSize="12px" fontWeight="bold" color="#f9e31a" letterSpacing="0.04em" lineHeight="20px">
              {effectiveAlgoId ?? clientOperator ?? "Expression"}
            </Text>
          </Box>
        )}

        {!isBinary && (
          <Text fontSize="20px" color="rgba(148,163,184,0.6)" flexShrink={0} mx="4px">
            (
          </Text>
        )}

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
            borderColor: validationError ? "rgba(251,113,133,0.6)" : "rgba(249,227,26,0.6)",
            boxShadow: validationError
              ? "0 0 0 1px rgba(251,113,133,0.25)"
              : "0 0 0 1px rgba(249,227,26,0.25)",
            bg: "rgba(255,255,255,0.08)",
          }}
          placeholder={placeholder}
        />

        {!isBinary && (
          <Text fontSize="20px" color="rgba(148,163,184,0.6)" flexShrink={0} mx="4px">
            )
          </Text>
        )}
      </HStack>

      {validationError && (
        <Text fontSize="10px" color="rgba(251,113,133,1)" px="6px" pt="4px">
          {validationError}
        </Text>
      )}

      {isBinary && detectedOperator && !validationError && (
        <Text fontSize="9px" color="rgba(148,163,184,0.7)" px="6px" pt="4px">
          parsed operator: <Text as="span" color="#f9e31a">{detectedOperator}</Text>
          {effectiveAlgoId && (
            <>
              {" → runs "}
              <Text as="span" color="#f9e31a">{effectiveAlgoId}</Text>
            </>
          )}
        </Text>
      )}

      <HStack gap="5px" flexWrap="wrap" px="6px" pt="8px">
        <Text fontSize="9px" color="rgba(100,116,139,1)" flexShrink={0} mr="2px">
          examples:
        </Text>
        <For each={presets}>
          {(preset: string) => (
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
