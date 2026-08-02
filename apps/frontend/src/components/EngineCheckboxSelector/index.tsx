import { Checkbox, CheckboxGroup, Fieldset, For, HStack } from "@chakra-ui/react";
import { EngineKey, isEngineKey } from "@/lib/types";
import { ENGINE_CAPABILITIES } from "@/lib/engineCapabilities";
import { Tooltip } from "@/components/ui/tooltip";

interface HeaderBarProps {
  selectedEngines: EngineKey[];
  onEnginesChange: (values: EngineKey[]) => void;
  tabs: { key: EngineKey; label: string }[];
}

function EngineCheckboxSelector({ selectedEngines, onEnginesChange, tabs }: HeaderBarProps) {
  return (
    <CheckboxGroup
      value={selectedEngines}
      onValueChange={(values) => {
        const normalized = (values as string[]).filter((value): value is EngineKey => isEngineKey(value));
        onEnginesChange(normalized);
      }}
      name="engines"
    >
      <Fieldset.Root>
        <Fieldset.Content>
          <HStack flexWrap="wrap" gap={3}>
            <For each={tabs}>
              {(tab) => (
                <Tooltip
                  key={tab.key}
                  openDelay={200}
                  closeDelay={80}
                  content={ENGINE_CAPABILITIES[tab.key].summary}
                  contentProps={{ maxW: "16rem", fontSize: "xs" }}
                >
                  <Checkbox.Root
                    value={tab.key}
                    px={2}
                    py={1}
                    borderRadius="md"
                    border="1px solid #64748b"
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label>{tab.label}</Checkbox.Label>
                  </Checkbox.Root>
                </Tooltip>
              )}
            </For>
          </HStack>
        </Fieldset.Content>
      </Fieldset.Root>
    </CheckboxGroup>
  );
}

export default EngineCheckboxSelector;
