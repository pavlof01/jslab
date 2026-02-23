"use client";

import * as React from "react";
import { Box, Input, Textarea, Text } from "@chakra-ui/react";

const MAX_LENGTH = 10000;

export interface ValueInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  height?: string;
  maxLength?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  onBlur?: () => void;
  placeholder?: string;
}

export function ValueInput({
  label,
  value,
  onChange,
  multiline = false,
  height = "50px",
  maxLength = MAX_LENGTH,
  onKeyDown,
  onBlur,
  placeholder,
}: ValueInputProps) {
  const [error, setError] = React.useState<string | null>(null);

  const handleChange = (newValue: string) => {
    setError(null);

    // Validate length
    if (newValue.length > maxLength) {
      setError(`Maximum length is ${maxLength} characters`);
      return;
    }

    onChange(newValue);
  };

  const isOverLimit = value.length > maxLength;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Text fontSize="xs" opacity={0.75}>
          {label}
        </Text>
        <Text fontSize="xs" opacity={0.5}>
          {value.length}/{maxLength}
        </Text>
      </Box>
      {multiline ? (
        <Textarea
          w="full"
          h={height}
          p={2}
          borderRadius="sm"
          fontSize="sm"
          fontFamily="monospace"
          value={value}
          onChange={(e) => handleChange(e.currentTarget.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder={placeholder}
          borderColor={isOverLimit ? "red.500" : undefined}
          _focus={{ borderColor: isOverLimit ? "red.500" : undefined }}
        />
      ) : (
        <Input
          size="sm"
          fontFamily="monospace"
          value={value}
          onChange={(e) => handleChange(e.currentTarget.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder={placeholder}
          borderColor={isOverLimit ? "red.500" : undefined}
          _focus={{ borderColor: isOverLimit ? "red.500" : undefined }}
        />
      )}
      {error && (
        <Text fontSize="xs" color="red.500" mt={1}>
          {error}
        </Text>
      )}
    </Box>
  );
}
