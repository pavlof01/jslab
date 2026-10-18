"use client";

import { createListCollection, Portal, Select } from "@chakra-ui/react";
import { useMemo } from "react";

type Props = {
  value: string;
  options: string[];
  onChange: (next: string) => void;
};

const AlgoPicker: React.FC<Props> = ({ value, options, onChange }) => {
  const collection = useMemo(() => createListCollection({ items: options }), [options]);

  return (
    <Select.Root
      collection={collection}
      size="sm"
      width="auto"
      minW="max-content"
      value={[value]}
      onValueChange={(event) => onChange(event.value[0])}
      positioning={{ sameWidth: false }}
    >
      <Select.Control>
        <Select.Trigger aria-label="Abstract operation to trace" w="max-content">
          <Select.ValueText whiteSpace="nowrap" overflow="visible" textOverflow="clip" />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content maxH="min(60dvh, 420px)">
            {collection.items.map((item) => (
              <Select.Item item={item} key={item}>
                <Select.ItemText>{item}</Select.ItemText>
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
};

export default AlgoPicker;
