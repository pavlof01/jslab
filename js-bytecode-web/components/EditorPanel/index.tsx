"use client";

import Editor from "@monaco-editor/react";
import { Box, Button, Checkbox, CheckboxGroup, Fieldset, For, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import type { SampleDescriptor, V8FlagOption } from "../../lib/types";
import { useColorModeValue } from "../ui/color-mode";

interface EditorPanelProps {
  code: string;
  onCodeChange: (value?: string) => void;
  onEditorMount: (editor: any, monaco: any) => void;
  samples: SampleDescriptor[];
  activeSampleKey: string | null;
  activeSampleDescription: string | null;
  onSelectSample: (key: string) => void;
  samplesOpen: boolean;
  onToggleSamples: () => void;
  v8FlagOptions: V8FlagOption[];
  selectedV8Flags: string[];
  onV8FlagsChange: (values: string[]) => void;
  v8FlagsOpen: boolean;
  onToggleV8Flags: () => void;
  showV8Flags: boolean;
  onEditorMountCleanup?: () => void;
}

export function EditorPanel({
  code,
  onCodeChange,
  onEditorMount,
  samples,
  activeSampleKey,
  activeSampleDescription,
  onSelectSample,
  samplesOpen,
  onToggleSamples,
  v8FlagOptions,
  selectedV8Flags,
  onV8FlagsChange,
  v8FlagsOpen,
  onToggleV8Flags,
  showV8Flags,
}: EditorPanelProps) {
  const subTextColor = useColorModeValue("#64748b", "#cbd5f5");
  const checkboxBorderColor = useColorModeValue("#94a3b8", "#64748b");
  const flagItemBg = useColorModeValue("#ffffff", "#1f2937");

  return (
    <>
      <Box px={5} pt={4} pb={2} overflowY="auto">
        <Stack gap={4} align="flex-start">
          <Box w="full">
            <HStack gap={4} align="center" flexWrap="wrap">
              <Button variant="ghost" size="sm" onClick={onToggleSamples} aria-expanded={samplesOpen}>
                <Text as="span" mr={2} fontWeight="bold">
                  {samplesOpen ? "▾" : "▸"}
                </Text>
                <Text as="span" fontWeight="semibold" textTransform="uppercase" letterSpacing="0.04em">
                  Samples
                </Text>
              </Button>
              {samplesOpen && activeSampleDescription && (
                <Text fontSize="sm" color={subTextColor} maxW="440px">
                  {activeSampleDescription}
                </Text>
              )}
            </HStack>
            {samplesOpen && (
              <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={2} mt={3} w="full">
                <For each={samples}>
                  {({ key, label, description }) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={activeSampleKey === key ? "solid" : "outline"}
                      colorScheme="blue"
                      borderRadius="full"
                      onClick={() => onSelectSample(key)}
                      title={description}
                    >
                      {label}
                    </Button>
                  )}
                </For>
              </SimpleGrid>
            )}
          </Box>

          {showV8Flags && (
            <CheckboxGroup value={selectedV8Flags} onValueChange={onV8FlagsChange} name="v8-flags">
              <Box w="full">
                <Button variant="ghost" size="sm" onClick={onToggleV8Flags} aria-expanded={v8FlagsOpen}>
                  <Text as="span" mr={2} fontWeight="bold">
                    {v8FlagsOpen ? "▾" : "▸"}
                  </Text>
                  <Text as="span" fontWeight="semibold" textTransform="uppercase" letterSpacing="0.04em">
                    V8 flags
                  </Text>
                </Button>
                {v8FlagsOpen && (
                  <Fieldset.Root>
                    <Fieldset.Content>
                      <Stack gap={3} mt={3}>
                        <For each={v8FlagOptions}>
                          {(option) => (
                            <Checkbox.Root
                              key={option.flag}
                              value={option.flag}
                              width="100%"
                              border={`1px solid ${checkboxBorderColor}`}
                              borderRadius="md"
                              bg={flagItemBg}
                            >
                              <Checkbox.HiddenInput />
                              <Checkbox.Control mt={1} />
                              <Checkbox.Label display="block" width="100%">
                                <Text fontWeight="semibold">{option.label}</Text>
                                <Text fontSize="sm" color={subTextColor} maxW="420px">
                                  {option.description}
                                </Text>
                              </Checkbox.Label>
                            </Checkbox.Root>
                          )}
                        </For>
                      </Stack>
                    </Fieldset.Content>
                  </Fieldset.Root>
                )}
              </Box>
            </CheckboxGroup>
          )}
        </Stack>
      </Box>
      <Box flex="1" minH={0} borderTop="1px solid" borderColor={useColorModeValue("#e2e8f0", "#334155")}>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={code}
          theme="vs-dark"
          onChange={onCodeChange}
          onMount={onEditorMount}
          options={{ minimap: { enabled: false }, fontSize: 14 }}
        />
      </Box>
    </>
  );
}
