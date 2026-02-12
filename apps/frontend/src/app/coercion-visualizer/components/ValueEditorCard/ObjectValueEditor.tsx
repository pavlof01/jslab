import { Box, HStack, Input, Select, Text, VStack } from "@chakra-ui/react";

import type { SpecValue } from "@/app/coercion-visualizer/spec-runner";
import { findPresetLabel, OBJECT_PRESETS, objectPresetCollection } from "@/app/coercion-visualizer/components/ValueEditorCard/valueEditorModel";

export function ObjectValueEditor({
  value,
  onChange,
}: {
  value: SpecValue & { type: "Object" };
  onChange: (next: SpecValue) => void;
}) {
  return (
    <VStack align="stretch" gap={3}>
      <Box>
        <Text fontSize="xs" opacity={0.75} mb={1}>
          Preset
        </Text>
        <Select.Root
          collection={objectPresetCollection}
          size="sm"
          value={[findPresetLabel(value) ?? OBJECT_PRESETS[0].label]}
          onValueChange={(details) => {
            const label = details.value[0];
            const preset = OBJECT_PRESETS.find((p) => p.label === label);
            if (preset) onChange(preset.value);
          }}
        >
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText placeholder="Preset" />
            </Select.Trigger>
            <Select.IndicatorGroup>
              <Select.Indicator />
            </Select.IndicatorGroup>
          </Select.Control>
          <Select.Positioner>
            <Select.Content>
              {objectPresetCollection.items.map((item) => (
                <Select.Item item={item} key={item.value}>
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Select.Root>
      </Box>

      <HStack gap={3} align="start" flexWrap="wrap">
        <Box flex="1" minW="160px">
          <Text fontSize="xs" opacity={0.75} mb={1}>
            Class
          </Text>
          <Input
            size="sm"
            value={value.value.class}
            onChange={(e) => onChange({ type: "Object", value: { ...value.value, class: e.target.value } })}
            placeholder="e.g. Array"
          />
        </Box>
        <Box flex="1" minW="160px">
          <Text fontSize="xs" opacity={0.75} mb={1}>
            Id
          </Text>
          <Input
            size="sm"
            value={value.value.id}
            onChange={(e) => onChange({ type: "Object", value: { ...value.value, id: e.target.value } })}
            placeholder="e.g. obj1"
          />
        </Box>
      </HStack>

      <Box>
        <Text fontSize="xs" opacity={0.75} mb={1}>
          Preview
        </Text>
        <Input
          size="sm"
          value={value.value.preview ?? ""}
          onChange={(e) => onChange({ type: "Object", value: { ...value.value, preview: e.target.value } })}
          placeholder="e.g. []"
        />
      </Box>
    </VStack>
  );
}
