"use client";

import { useMemo } from "react";
import { createListCollection, Portal, Select, Span, Stack, Text } from "@chakra-ui/react";

import { useV8Flags } from "@/store/engineOutputsSelectors";
import { useV8FlagCatalog } from "./context";

type FlagItem = { value: string; label: string; description: string; group: string };

const V8FlagSelector = () => {
  const { selectedV8Flags, setSelectedV8Flags } = useV8Flags();
  const groups = useV8FlagCatalog();

  const collection = useMemo(
    () =>
      createListCollection<FlagItem>({
        items: groups.flatMap((group) =>
          group.flags.map((flag) => ({
            value: flag.flag,
            label: flag.flag.replace(/^--/, ""),
            description: flag.description,
            group: group.label,
          })),
        ),
        groupBy: (item) => item.group,
      }),
    [groups],
  );

  const count = selectedV8Flags.length;

  return (
    <Select.Root
      multiple
      collection={collection}
      size="sm"
      width="auto"
      value={selectedV8Flags}
      onValueChange={(e) => setSelectedV8Flags(e.value)}
      disabled={collection.items.length === 0}
    >
      <Select.Control>
        <Select.Trigger>
          <Span>{count ? `${count} v8 flag${count === 1 ? "" : "s"}` : "v8 flags"}</Span>
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content maxH="min(60dvh, 420px)">
            {collection.group().map(([label, items]) => (
              <Select.ItemGroup key={label}>
                <Select.ItemGroupLabel>{label}</Select.ItemGroupLabel>
                {items.map((flag) => (
                  <Select.Item item={flag} key={flag.value}>
                    <Stack gap="0.5">
                      <Select.ItemText>{flag.label}</Select.ItemText>
                      <Span color="ink.label" fontSize="11px" lineHeight="1.45">
                        {flag.description}
                      </Span>
                    </Stack>
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.ItemGroup>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
};

export default V8FlagSelector;
