"use client";

import { useMemo, useState } from "react";
import { Badge, Box, Flex, HStack, Input, NativeSelect, Select, Stack, Text } from "@chakra-ui/react";
import { LooseEqualityTracePlayer } from "./components/LooseEqualityTrace";
import { traceEqualityComparisons } from "@/lib/ecma262/isLooselyEqualTrace";
import { Tooltip } from "../ui/tooltip";

type ValueType = "string" | "number" | "boolean" | "bigint" | "null" | "undefined" | "json";

type TypedInput = { raw: string; type: ValueType };

const defaultX: TypedInput = { raw: "5", type: "string" };
const defaultY: TypedInput = { raw: "5", type: "number" };

function coerceValue(input: TypedInput): { value?: unknown; error?: string } {
  const text = input.raw.trim();
  switch (input.type) {
    case "string":
      return { value: text };
    case "number": {
      const num = Number(text);
      if (Number.isNaN(num)) return { error: "Invalid number" };
      return { value: num };
    }
    case "boolean": {
      if (text.toLowerCase() === "true") return { value: true };
      if (text.toLowerCase() === "false") return { value: false };
      return { error: "Use true or false" };
    }
    case "bigint": {
      try {
        return { value: BigInt(text) };
      } catch (err) {
        return { error: "Invalid bigint" };
      }
    }
    case "null":
      return { value: null };
    case "undefined":
      return { value: undefined };
    case "json":
      try {
        return { value: JSON.parse(text) };
      } catch (err) {
        return { error: "Invalid JSON" };
      }
    default:
      return { value: text };
  }
}

function ResultBadge({ label, value }: { label: string; value: boolean | undefined }) {
  const scheme = value === undefined ? "gray" : value ? "green" : "red";
  const text = value === undefined ? "?" : String(value);
  return (
    <Badge colorPalette={scheme} variant="surface" px={2} py={1} borderRadius="md" textTransform="none">
      {label}: {text}
    </Badge>
  );
}

export function LooseEqualityPlayground() {
  const [xInput, setXInput] = useState<TypedInput>(defaultX);
  const [yInput, setYInput] = useState<TypedInput>(defaultY);

  const parsedX = useMemo(() => coerceValue(xInput), [xInput]);
  const parsedY = useMemo(() => coerceValue(yInput), [yInput]);

  const summary = useMemo(() => {
    if (parsedX.error || parsedY.error) return null;
    return traceEqualityComparisons(parsedX.value, parsedY.value);
  }, [parsedX, parsedY]);

  return (
    <Box borderTop="1px solid" borderColor="gray.200" _dark={{ borderColor: "gray.700" }} px={4} pb={4} pt={5}>
      <HStack justify="space-between" align="baseline" mb={3}>
        <Text fontWeight="semibold">Loose Equality Visualizer</Text>
        <Text fontSize="xs" color="gray.500">
          local spec trace
        </Text>
      </HStack>

      <Stack direction={{ base: "column", md: "row" }} gap={3} align="stretch">
        <InputWithType
          label="x"
          value={xInput.raw}
          type={xInput.type}
          onChangeValue={(raw) => setXInput((prev) => ({ ...prev, raw }))}
          onChangeType={(type) => setXInput((prev) => ({ ...prev, type }))}
          error={parsedX.error}
        />
        <InputWithType
          label="y"
          value={yInput.raw}
          type={yInput.type}
          onChangeValue={(raw) => setYInput((prev) => ({ ...prev, raw }))}
          onChangeType={(type) => setYInput((prev) => ({ ...prev, type }))}
          error={parsedY.error}
        />
      </Stack>

      <HStack mt={3} gap={2} wrap="wrap">
        <ResultBadge label="==" value={summary?.looseResult} />
        <ResultBadge label="===" value={summary?.strictEqual} />
        <ResultBadge label="Object.is" value={summary?.objectIs} />
      </HStack>

      {/* <Divider my={4} /> */}

      {summary ? (
        <LooseEqualityTracePlayer trace={summary.looseTrace} />
      ) : (
        <Text color="red.400" fontSize="sm">
          {parsedX.error || parsedY.error}
        </Text>
      )}
    </Box>
  );
}

type InputProps = {
  label: string;
  value: string;
  type: ValueType;
  onChangeValue: (next: string) => void;
  onChangeType: (next: ValueType) => void;
  error?: string;
};

function InputWithType({ label, value, type, onChangeType, onChangeValue, error }: InputProps) {
  return (
    <Stack gap={1} flex={1}>
      <Text fontSize="sm" color="gray.500">
        {label}
      </Text>
      <Flex gap={2}>
        <Input value={value} onChange={(e) => onChangeValue(e.target.value)} placeholder='e.g. 5 or "5"' />
        <Tooltip content="Interpretation of the value">
          <NativeSelect.Root w="160px">
            <NativeSelect.Field
              placeholder="Select option"
              value={type}
              onChange={(e) => onChangeType(e.target.value as ValueType)}
            >
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
              <option value="bigint">bigint</option>
              <option value="null">null</option>
              <option value="undefined">undefined</option>
              <option value="json">JSON/object</option>
            </NativeSelect.Field>
          </NativeSelect.Root>
        </Tooltip>
      </Flex>
      {error && (
        <Text color="red.400" fontSize="xs">
          {error}
        </Text>
      )}
    </Stack>
  );
}
