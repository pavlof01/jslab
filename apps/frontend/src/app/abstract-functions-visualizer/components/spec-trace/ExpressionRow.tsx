"use client";

import type { ReactNode } from "react";
import { Box, Button, Flex, Input, Span } from "@chakra-ui/react";

import { Band, ShortcutHint } from "@/components/ui";
import { Label } from "@/components/ui/label";

type Props = {
  expression: string;
  onExpressionChange: (value: string) => void;
  onTrace: (value: string) => void;
  result?: string;
  tracing: boolean;
  error: string | null;
  hint: ReactNode;
  extraControl?: ReactNode;
};

export function ExpressionRow({
  expression,
  onExpressionChange,
  onTrace,
  result,
  tracing,
  error,
  hint,
  extraControl,
}: Props) {
  return (
    <Band>
      <Label>your expression</Label>

      <Flex
        flex="1 1 300px"
        minW={0}
        align="center"
        gap="9px"
        borderWidth="1px"
        borderColor="rule.control"
        _focusWithin={{ borderColor: "accent" }}
        bg="surface.base"
        px="12px"
      >
        <Span textStyle="code" aria-hidden="true" color="accent">
          ›
        </Span>
        <Input
          variant="seamless"
          type="text"
          value={expression}
          onChange={(event) => onExpressionChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onTrace(event.currentTarget.value);
          }}
          spellCheck={false}
          autoComplete="off"
          aria-label="Expression to trace"
          flex="1 1 auto"
          minW={0}
          py="10px"
          fontSize="14.5px"
          letterSpacing="-0.01em"
        />
      </Flex>
      {result ? (
        <Flex
          textStyle="codeXl"
          align="baseline"
          gap="9px"
          opacity={tracing ? "pending" : 1}
          transitionProperty="opacity"
          transitionDuration="reveal"
          transitionTimingFunction="DEFAULT"
        >
          <Span aria-hidden="true" color="ink.6">
            ⟶
          </Span>
          <Span color="accent" overflowWrap="anywhere">
            {result}
          </Span>
        </Flex>
      ) : null}

      {extraControl}

      <Button variant="primary" size="md" disabled={tracing} onClick={() => onTrace(expression)}>
        {tracing ? "tracing…" : "trace"}
        <ShortcutHint>↵</ShortcutHint>
      </Button>

      {error ? (
        <Flex textStyle="code" role="alert" flex="1 1 100%" align="baseline" gap="9px" color="status.warn">
          <Span aria-hidden="true">×</Span>
          <Span textWrap="pretty" overflowWrap="anywhere">
            {error}
          </Span>
        </Flex>
      ) : null}

      <Box textStyle="codeSm" flex="1 1 100%" lineHeight="1.55" color="ink.5" textWrap="pretty">
        {hint}
      </Box>
    </Band>
  );
}
