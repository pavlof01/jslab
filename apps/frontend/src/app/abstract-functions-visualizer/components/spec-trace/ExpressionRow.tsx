"use client";

import { Box, Button, Flex, Input, Span } from "@chakra-ui/react";
import type { ReactNode } from "react";

import { Band } from "@/components/ui";
import Label from "@/components/ui/label";

type Props = {
  expression: string;
  onExpressionChange: (value: string) => void;
  onTrace: (value: string) => void;
  placeholder?: string;
  result?: string;
  tracing: boolean;
  error: string | null;
  hint: ReactNode;
  extraControl?: ReactNode;
};

const ExpressionRow: React.FC<Props> = ({
  expression,
  onExpressionChange,
  onTrace,
  placeholder,
  result,
  tracing,
  error,
  hint,
  extraControl,
}) => {
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
          placeholder={placeholder}
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
          align="baseline"
          gap="10px"
          minW={0}
          opacity={tracing ? "pending" : 1}
          transitionProperty="opacity"
          transitionDuration="reveal"
          transitionTimingFunction="DEFAULT"
          aria-live="polite"
        >
          <Span aria-hidden="true" color="ink.5" fontFamily="mono" fontSize="16px">
            ⟶
          </Span>
          <Span
            fontFamily="mono"
            fontSize="clamp(16px, 1.6vw, 20px)"
            color="accent"
            overflowWrap="anywhere"
          >
            {result}
          </Span>
        </Flex>
      ) : null}

      {extraControl}

      <Button
        variant="primary"
        size="sm"
        px="16px"
        py="9px"
        fontWeight="700"
        letterSpacing="label"
        disabled={tracing}
        onClick={() => onTrace(expression)}
      >
        {tracing ? "tracing…" : "trace"}
        <Span aria-hidden="true">↵</Span>
      </Button>

      {error ? (
        <Flex
          textStyle="code"
          role="alert"
          flex="1 1 100%"
          align="baseline"
          gap="9px"
          color="status.error"
        >
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
};

export default ExpressionRow;
