"use client";

import { createListCollection, Portal, Select, Span, Stack } from "@chakra-ui/react";
import { useMemo } from "react";

import { engineLabel } from "@/lib/engines";
import type { EngineKey } from "@/lib/types";
import { useEngineFlags } from "@/store/engineOutputsSelectors";

import { useFlagGroups } from "./context";

type FlagItem = { value: string; label: string; description: string; group: string };

/**
 * Flag picker for one engine. The engine is a prop rather than baked in: the
 * gateway sanitizes flags per engine from one catalog, so the UI has no reason
 * to be V8-only either.
 */
const FlagSelector = ({ engine }: { engine: EngineKey }) => {
  const { flagsFor, setEngineFlags } = useEngineFlags();
  const groups = useFlagGroups(engine);
  const selected = flagsFor(engine);

  const collection = useMemo(
    () =>
      createListCollection<FlagItem>({
        items: groups.flatMap((group) =>
          group.flags.map((flag) => ({
            value: flag.flag,
            label: flag.flag.replace(/^-+/, ""),
            description: flag.description,
            group: group.label,
          })),
        ),
        groupBy: (item) => item.group,
      }),
    [groups],
  );

  const name = engineLabel(engine).toLowerCase();
  const count = selected.length;

  return (
    <Select.Root
      multiple
      collection={collection}
      size="sm"
      width="auto"
      value={selected}
      onValueChange={(e) => setEngineFlags(engine, e.value)}
      disabled={collection.items.length === 0}
    >
      <Select.Control>
        <Select.Trigger>
          <Span>{count ? `${count} ${name} flag${count === 1 ? "" : "s"}` : `${name} flags`}</Span>
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

export default FlagSelector;
