"use client";

import * as React from "react";
import { Box, Card, HStack, Input, NativeSelectField, NativeSelectRoot, Text, VStack } from "@chakra-ui/react";

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
  entryLabel: string;
  onAlgoChange?: (val: string) => void;
  userInputRaw: string;
  hasNodes: boolean;
  onInputChange?: (val: string) => void;
  onInputCommit?: (val: string) => void;
};

const EntryPointSection: React.FC<Props> = ({ entryLabel, onAlgoChange, userInputRaw, hasNodes, onInputChange, onInputCommit }) => {
  const interactive = !!onInputChange;

  const [algoOptions, setAlgoOptions] = React.useState<string[]>([]);

  React.useEffect(() => {
    fetch("/api/trace/functions")
      .then((r) => r.json())
      .then((data: { available_functions?: string[] }) => {
        if (Array.isArray(data.available_functions)) {
          setAlgoOptions(data.available_functions);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <VStack align="center" gap={0}>
      <Card.Root
        size="sm"
        borderWidth="2px"
        borderColor="rgba(255,255,255,0.14)"
        bg="brandAlpha.50"
        w={{ base: "full", md: "480px" }}
      >
        <Card.Header pb={2}>
          <Text fontSize="9px" fontWeight="black" letterSpacing="widest" textTransform="uppercase" color="#f9e31a">
            Entry Point
          </Text>
        </Card.Header>
        <Card.Body pt={0} gap={3} display="flex" flexDirection="column">
          {interactive ? (
            <>
              <HStack gap={2}>
                {algoOptions.length > 0 ? (
                  <NativeSelectRoot
                    size="sm"
                    variant="plain"
                    w="auto"
                    flexShrink={0}
                    border="1px solid"
                    borderColor="rgba(249,227,26,0.3)"
                    borderRadius="md"
                    px={2}
                    bg="brandAlpha.50"
                    _hover={{ borderColor: "rgba(249,227,26,0.6)", bg: "brandAlpha.100" }}
                    transition="all 0.15s"
                  >
                    <NativeSelectField
                      value={entryLabel}
                      onChange={(e) => onAlgoChange?.(e.target.value)}
                      fontFamily="mono"
                      fontSize="sm"
                      fontWeight="bold"
                      color="#f9e31a"
                      bg="transparent"
                      border="none"
                      outline="none"
                      cursor="pointer"
                      px={0}
                      w="auto"
                    >
                      {algoOptions.map((opt) => (
                        <option key={opt} value={opt} style={{ background: "#1a1a1a", color: "#fff" }}>
                          {opt}
                        </option>
                      ))}
                    </NativeSelectField>
                  </NativeSelectRoot>
                ) : (
                  <Text fontFamily="mono" fontSize="sm" fontWeight="bold" whiteSpace="nowrap" opacity={0.7}>
                    {entryLabel}
                  </Text>
                )}
                <Text fontFamily="mono" fontSize="sm" fontWeight="bold" whiteSpace="nowrap" opacity={0.7}>(</Text>
                <Input
                  value={userInputRaw}
                  onChange={(e) => onInputChange?.(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onInputCommit?.(userInputRaw);
                  }}
                  onBlur={() => onInputCommit?.(userInputRaw)}
                  fontFamily="mono"
                  fontSize="sm"
                  size="sm"
                  flex="1"
                  minW={0}
                  bg="scrim.100"
                  borderColor="rgba(249,227,26,0.25)"
                  _focus={{ borderColor: "rgba(249,227,26,0.6)", boxShadow: "0 0 0 1px rgba(249,227,26,0.3)" }}
                  placeholder='e.g. 42, "hello", {}'
                />
                <Text fontFamily="mono" fontSize="sm" fontWeight="bold" opacity={0.7}>)</Text>
              </HStack>
              <HStack gap={1} flexWrap="wrap">
                {PRESETS.map((p) => (
                  <Box
                    key={p}
                    as="button"
                    px={1.5}
                    py={0.5}
                    borderRadius="sm"
                    border="1px solid"
                    borderColor="rgba(249,227,26,0.15)"
                    bg="transparent"
                    fontSize="9px"
                    fontFamily="mono"
                    color="rgba(249,227,26,0.6)"
                    cursor="pointer"
                    _hover={{ borderColor: "rgba(249,227,26,0.5)", color: "#f9e31a", bg: "brandAlpha.50" }}
                    transition="all 0.15s"
                    onClick={() => {
                      onInputChange?.(p);
                      onInputCommit?.(p);
                    }}
                  >
                    {p}
                  </Box>
                ))}
              </HStack>
            </>
          ) : (
            <Text fontFamily="mono" fontSize="sm" fontWeight="bold">
              {entryLabel}({userInputRaw})
            </Text>
          )}
        </Card.Body>
      </Card.Root>

      {hasNodes ? <Box w="2px" h={8} bg="glow.brand" boxShadow="0 0 8px rgba(249,227,26,0.35)" /> : null}
    </VStack>
  );
};

export default EntryPointSection;
