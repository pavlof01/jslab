"use client";

import * as React from "react";
import { Box, Button, Card, Code, HStack, Input, Select, Switch, Text, VStack } from "@chakra-ui/react";

import type { SpecValue } from "@/app/coercion-visualizer/spec-runner";
import { ObjectValueEditor } from "@/app/coercion-visualizer/components/ValueEditorCard/ObjectValueEditor";
import { defaultValueForType, newSymbolId, toEditableType, type EditableType, typeCollection } from "@/app/coercion-visualizer/components/ValueEditorCard/valueEditorModel";

function normalizeBigIntInput(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return "0";
  let s = trimmed;
  if (s.endsWith("n") || s.endsWith("N")) s = s.slice(0, -1);
  s = s.replaceAll("_", "");
  try {
    return BigInt(s).toString();
  } catch {
    return undefined;
  }
}

export function ValueEditorCard({
  label,
  value,
  onChange,
}: {
  label: string;
  value: SpecValue;
  onChange: (next: SpecValue) => void;
}) {
  const editableType = toEditableType(value);
  const [bigIntRaw, setBigIntRaw] = React.useState(() => (value.type === "BigInt" ? `${value.value}n` : "0n"));

  React.useEffect(() => {
    if (value.type === "BigInt") setBigIntRaw(`${value.value}n`);
  }, [value.type, value.value]);

  const handleTypeChange = (nextType: EditableType) => {
    onChange(defaultValueForType(nextType));
  };

  return (
    <Card.Root variant="subtle" size="sm">
      <Card.Header pb={2}>
        <HStack justify="space-between" align="start" gap={4} flexWrap="wrap">
          <VStack align="start" gap={0.5}>
            <Text fontWeight="semibold">{label}</Text>
            <Text fontSize="xs" opacity={0.75}>
              Current: <Code>{value.type}</Code>
            </Text>
          </VStack>

          <Box minW="220px" flex="1">
            <Select.Root
              collection={typeCollection}
              size="sm"
              value={[editableType]}
              onValueChange={(details) => {
                const next = details.value[0] as EditableType | undefined;
                if (next) handleTypeChange(next);
              }}
            >
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText placeholder="Type" />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Select.Positioner>
                <Select.Content>
                  {typeCollection.items.map((item) => (
                    <Select.Item item={item} key={item.value}>
                      <Select.ItemText>{item.label}</Select.ItemText>
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
          </Box>
        </HStack>
      </Card.Header>

      <Card.Body pt={2}>
        {value.type === "Number" ? (
          <HStack gap={2} align="center">
            <Input
              size="sm"
              value={value.value === "NaN" ? "NaN" : Object.is(value.value, -0) ? "-0" : String(value.value)}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (raw.length === 0) return onChange({ type: "Number", value: 0 });
                if (raw.toLowerCase() === "nan") return onChange({ type: "Number", value: "NaN" });
                const n = Number(raw);
                if (Number.isNaN(n)) return onChange({ type: "Number", value: "NaN" });
                return onChange({ type: "Number", value: n });
              }}
              placeholder="e.g. 1, -0, NaN"
            />
            <Button size="sm" variant="outline" onClick={() => onChange({ type: "Number", value: "NaN" })}>
              NaN
            </Button>
          </HStack>
        ) : value.type === "BigInt" ? (
          <Input
            size="sm"
            value={bigIntRaw}
            onChange={(e) => {
              const raw = e.target.value;
              setBigIntRaw(raw);
              const normalized = normalizeBigIntInput(raw);
              if (!normalized) return;
              onChange({ type: "BigInt", value: normalized });
            }}
            onBlur={() => {
              const normalized = normalizeBigIntInput(bigIntRaw);
              if (normalized) setBigIntRaw(`${normalized}n`);
              else if (value.type === "BigInt") setBigIntRaw(`${value.value}n`);
            }}
            placeholder="e.g. 1n, -1n, 0xFFn"
          />
        ) : value.type === "String" ? (
          <Input
            size="sm"
            value={value.value}
            onChange={(e) => onChange({ type: "String", value: e.target.value })}
            placeholder='e.g. "1"'
          />
        ) : value.type === "Boolean" ? (
          <Switch.Root
            checked={value.value}
            onCheckedChange={(details) => onChange({ type: "Boolean", value: details.checked })}
          >
            <Switch.HiddenInput />
            <HStack gap={3}>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Label>{String(value.value)}</Switch.Label>
            </HStack>
          </Switch.Root>
        ) : value.type === "Null" ? (
          <Text opacity={0.8}>null</Text>
        ) : value.type === "Undefined" ? (
            <Text opacity={0.8}>undefined</Text>
          ) : value.type === "Object" ? (
            <ObjectValueEditor value={value} onChange={onChange} />
          ) : value.type === "Symbol" ? (
            <VStack align="stretch" gap={3}>
              <HStack gap={3} align="start" flexWrap="wrap">
                <Box flex="1" minW="160px">
                  <Text fontSize="xs" opacity={0.75} mb={1}>
                    Description
                  </Text>
                  <Input
                    size="sm"
                    value={value.value.description ?? ""}
                    onChange={(e) =>
                      onChange({
                        type: "Symbol",
                        value: { ...value.value, description: e.target.value },
                      })
                    }
                    placeholder='e.g. "iterator"'
                  />
                </Box>
                <Box flex="1" minW="160px">
                  <HStack justify="space-between" gap={2} mb={1}>
                    <Text fontSize="xs" opacity={0.75}>
                      Id
                    </Text>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => onChange({ type: "Symbol", value: { ...value.value, id: newSymbolId() } })}
                    >
                      New
                    </Button>
                  </HStack>
                  <Input
                    size="sm"
                    value={value.value.id}
                    onChange={(e) => onChange({ type: "Symbol", value: { ...value.value, id: e.target.value } })}
                    placeholder="e.g. sym1"
                  />
                </Box>
              </HStack>
              <Text fontSize="xs" opacity={0.75}>
                Preview:{" "}
                <Code>
                  {value.value.description !== undefined
                    ? `Symbol(${JSON.stringify(value.value.description)})`
                    : "Symbol()"}
                  @{value.value.id}
                </Code>
              </Text>
            </VStack>
          ) : (
            <Text opacity={0.8}>Unsupported value type: {value.type}</Text>
          )}
      </Card.Body>
    </Card.Root>
  );
}
