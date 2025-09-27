"use client";

import Editor from "@monaco-editor/react";
import { Box, Button, For, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
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
