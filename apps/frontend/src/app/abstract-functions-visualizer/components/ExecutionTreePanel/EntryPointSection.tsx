"use client";

import * as React from "react";
import { Box, Card, HStack, Input, Text, VStack } from "@chakra-ui/react";

const PRESETS = ["42", '"42"', '"hello"', "true", "false", "null", "undefined", "Symbol()", "42n", "{}",
  '{ valueOf: () => "1" }', "[]"];

export function EntryPointSection({
  entryLabel,
  userInputRaw,
  hasNodes,
  onInputChange,
  onInputCommit,
}: {
  entryLabel: string;
  userInputRaw: string;
  hasNodes: boolean;
  onInputChange?: (val: string) => void;
  onInputCommit?: (val: string) => void;
}) {
  const interactive = !!onInputChange;

  return (
    <VStack align="center" gap={0}>
      <Card.Root
        size="sm"
        borderWidth="2px"
        borderColor="rgba(255,255,255,0.14)"
        bg="rgba(249,227,26,0.06)"
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
                <Text fontFamily="mono" fontSize="sm" fontWeight="bold" whiteSpace="nowrap" opacity={0.7}>
                  {entryLabel}(
                </Text>
                <Input
                  value={userInputRaw}
                  onChange={(e) => onInputChange?.(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") onInputCommit?.(userInputRaw); }}
                  onBlur={() => onInputCommit?.(userInputRaw)}
                  fontFamily="mono"
                  fontSize="sm"
                  size="sm"
                  flex="1"
                  bg="rgba(0,0,0,0.25)"
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
                    _hover={{ borderColor: "rgba(249,227,26,0.5)", color: "#f9e31a", bg: "rgba(249,227,26,0.06)" }}
                    transition="all 0.15s"
                    onClick={() => { onInputChange?.(p); onInputCommit?.(p); }}
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

      {hasNodes ? <Box w="2px" h={8} bg="rgba(249,227,26,0.55)" boxShadow="0 0 8px rgba(249,227,26,0.35)" /> : null}
    </VStack>
  );
}
