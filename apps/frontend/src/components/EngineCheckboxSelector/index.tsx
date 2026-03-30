import { Checkbox, CheckboxGroup, Fieldset, For, HStack } from "@chakra-ui/react";
import { EngineKey, isEngineKey } from "@/lib/types";
import { useColorModeValue } from "../ui/color-mode";

interface HeaderBarProps {
  selectedEngines: EngineKey[];
  onEnginesChange: (values: EngineKey[]) => void;
  tabs: { key: EngineKey; label: string }[];
}

function EngineCheckboxSelector({ selectedEngines, onEnginesChange, tabs }: HeaderBarProps) {
  const checkboxBorderColor = useColorModeValue("#94a3b8", "#64748b");
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
                <Checkbox.Root
                  key={tab.key}
                  value={tab.key}
                  px={2}
                  py={1}
                  borderRadius="md"
                  border={`1px solid ${checkboxBorderColor}`}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>{tab.label}</Checkbox.Label>
                </Checkbox.Root>
              )}
            </For>
          </HStack>
        </Fieldset.Content>
      </Fieldset.Root>
    </CheckboxGroup>
  );
}

export default EngineCheckboxSelector;
