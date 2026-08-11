import React, { useCallback, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import {
  Box,
  Button,
  Card,
  CloseButton,
  CodeBlock,
  createShikiAdapter,
  Dialog,
  Separator,
  HStack,
  Input,
  Textarea,
  Portal,
  SimpleGrid,
  Stack,
  Text,
  Presence,
  Code,
} from "@chakra-ui/react";
import type { HighlighterGeneric } from "shiki";
import { samples, sampleCatalog, v8Samples, v8SampleCatalog } from "@/lib/samples";
import type { V8SampleKey } from "@/lib/samples";

export { samples, sampleCatalog };
export type SampleKey = keyof typeof samples;
export type SampleDescriptor = { key: SampleKey; label: string; description: string };

type CustomSample = {
  id: string;
  name: string;
  code: string;
  createdAt: number;
  description?: string;
};

const CUSTOM_SAMPLES_STORAGE_KEY = "js-bytecode-web.custom-samples";

type Props = {
  currentCode: string;
  onSelectSample: (code: string) => void;
};

function Samples({ currentCode, onSelectSample }: Props) {
  const [browseOpen, setBrowseOpen] = useState(false);
  const [v8BrowseOpen, setV8BrowseOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [customSamples, setCustomSamples] = useState<CustomSample[]>([]);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<CustomSample | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameDescription, setRenameDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CustomSample | null>(null);

  const lastLoadedCodeRef = useRef(currentCode);
  const baselineInitialisedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CUSTOM_SAMPLES_STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const valid = parsed.filter(
          (item): item is CustomSample =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as any).id === "string" &&
            typeof (item as any).name === "string" &&
            typeof (item as any).code === "string" &&
            (typeof (item as any).description === "undefined" || typeof (item as any).description === "string"),
        );
        if (valid.length) {
          setCustomSamples(valid);
        }
      }
    } catch {
      // ignore malformed localStorage entries
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CUSTOM_SAMPLES_STORAGE_KEY, JSON.stringify(customSamples));
  }, [customSamples]);

  useEffect(() => {
    if (baselineInitialisedRef.current) return;
    baselineInitialisedRef.current = true;
    const defaultMatch = (Object.entries(samples) as [SampleKey, string][]).find(
      ([, snippet]) => snippet === currentCode,
    );
    if (defaultMatch) {
      setActiveSampleId(`default:${defaultMatch[0]}`);
      lastLoadedCodeRef.current = defaultMatch[1];
      return;
    }
    const v8Match = (Object.entries(v8Samples) as [V8SampleKey, string][]).find(
      ([, snippet]) => snippet === currentCode,
    );
    if (v8Match) {
      setActiveSampleId(`v8:${v8Match[0]}`);
      lastLoadedCodeRef.current = v8Match[1];
      return;
    }
    const customMatch = customSamples.find((item) => item.code === currentCode);
    if (customMatch) {
      setActiveSampleId(customMatch.id);
      lastLoadedCodeRef.current = customMatch.code;
      return;
    }
    lastLoadedCodeRef.current = currentCode;
  }, [currentCode, customSamples]);

  const handleSelectSample = useCallback(
    (code: string, sampleId: string) => {
      lastLoadedCodeRef.current = code;
      setActiveSampleId(sampleId);
      baselineInitialisedRef.current = true;
      onSelectSample(code);
      setBrowseOpen(false);
      setV8BrowseOpen(false);
    },
    [onSelectSample],
  );

  const handleSelectDefault = useCallback(
    (key: SampleKey) => {
      handleSelectSample(samples[key], `default:${key}`);
    },
    [handleSelectSample],
  );

  const handleSelectV8 = useCallback(
    (key: V8SampleKey) => {
      handleSelectSample(v8Samples[key], `v8:${key}`);
    },
    [handleSelectSample],
  );

  const handleSelectCustom = useCallback(
    (sample: CustomSample) => {
      handleSelectSample(sample.code, sample.id);
    },
    [handleSelectSample],
  );

  const openSaveDialog = useCallback(() => {
    setSaveName("");
    setSaveError(null);
    setSaveOpen(true);
  }, []);

  const closeSaveDialog = useCallback(() => {
    setSaveOpen(false);
    setSaveName("");
    setSaveError(null);
  }, []);

  const handleSaveSample = useCallback(() => {
    const trimmed = saveName.trim();
    if (!trimmed) {
      setSaveError("Please provide a name for the sample.");
      return;
    }
    const nameTaken =
      customSamples.some((sample) => sample.name.toLowerCase() === trimmed.toLowerCase()) ||
      sampleCatalog.some((sample) => sample.label.toLowerCase() === trimmed.toLowerCase());
    if (nameTaken) {
      setSaveError("A sample with this name already exists.");
      return;
    }
    const newSample: CustomSample = {
      id: `custom-${Date.now()}`,
      name: trimmed,
      code: currentCode,
      createdAt: Date.now(),
    };
    setCustomSamples((prev) => [...prev, newSample]);
    lastLoadedCodeRef.current = currentCode;
    setActiveSampleId(newSample.id);
    closeSaveDialog();
  }, [closeSaveDialog, currentCode, customSamples, saveName]);

  useEffect(() => {
    if (saveOpen) {
      setSaveError(null);
    }
  }, [saveOpen]);

  const hasChanges = currentCode !== (lastLoadedCodeRef.current ?? "");
  const canSave = currentCode.trim().length > 0 && hasChanges;

  const shikiAdapter = useMemo(() => {
    if (!browseOpen && !v8BrowseOpen) return null;
    return createShikiAdapter<HighlighterGeneric<any, any>>({
      async load() {
        const { createHighlighter } = await import("shiki");
        return createHighlighter({
          langs: ["javascript"],
          themes: ["github-dark"],
        });
      },
      theme: "github-dark",
    });
    // Both dialogs render code previews through this adapter, so both must be
    // in the dependency list: with only `browseOpen` here, opening the V8
    // dialog first left the adapter null and its cards rendered without code.
  }, [browseOpen, v8BrowseOpen]);

  const openRenameDialog = useCallback((sample: CustomSample) => {
    setRenameTarget(sample);
    setRenameName(sample.name);
    setRenameError(null);
    setRenameDescription(sample.description ?? "");
  }, []);

  const closeRenameDialog = useCallback(() => {
    setRenameTarget(null);
    setRenameName("");
    setRenameError(null);
    setRenameDescription("");
  }, []);

  const handleRenameSample = useCallback(() => {
    if (!renameTarget) return;
    const trimmed = renameName.trim();
    if (!trimmed) {
      setRenameError("Please provide a name for the sample.");
      return;
    }
    const normalized = trimmed.toLowerCase();
    const nameTaken =
      customSamples.some((sample) => sample.id !== renameTarget.id && sample.name.toLowerCase() === normalized) ||
      sampleCatalog.some((sample) => sample.label.toLowerCase() === normalized);
    if (nameTaken) {
      setRenameError("A sample with this name already exists.");
      return;
    }

    const descriptionValue = renameDescription.trim();

    setCustomSamples((prev) =>
      prev.map((sample) =>
        sample.id === renameTarget.id ? { ...sample, name: trimmed, description: descriptionValue } : sample,
      ),
    );
    closeRenameDialog();
  }, [closeRenameDialog, customSamples, renameDescription, renameName, renameTarget]);

  const openDeleteDialog = useCallback((sample: CustomSample) => {
    setDeleteTarget(sample);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const handleDeleteSample = useCallback(() => {
    if (!deleteTarget) return;
    setCustomSamples((prev) => prev.filter((sample) => sample.id !== deleteTarget.id));
    if (activeSampleId === deleteTarget.id) {
      setActiveSampleId(null);
    }
    closeDeleteDialog();
  }, [activeSampleId, closeDeleteDialog, deleteTarget]);

  const renderSampleCard = useCallback(
    ({
      id,
      title,
      description,
      snippet,
      onClick,
      actions,
    }: {
      id: string;
      title: string;
      description: string;
      snippet: string;
      onClick: () => void;
      actions?: ReactNode;
    }) => {
      const isActive = activeSampleId === id;
      return (
        <Card.Root
          key={id}
          width="100%"
          size="sm"
          role="button"
          aria-label={`Select ${title} sample`}
          _hover={{ backgroundColor: "gray.800", cursor: "pointer" }}
          border="1px solid"
          borderColor={isActive ? "blue.400" : "#334155"}
          boxShadow={isActive ? "0 0 0 1px rgba(59, 130, 246, 0.45)" : "none"}
          onClick={onClick}
        >
          <Card.Body>
            <Stack gap={2}>
              <HStack align="flex-start" justify="space-between" gap={3}>
                <Box flex="1">
                  <Card.Title>{title}</Card.Title>
                  <Card.Description>{description}</Card.Description>
                </Box>
                {actions && <HStack gap={1}>{actions}</HStack>}
              </HStack>

              {shikiAdapter && (
                <CodeBlock.AdapterProvider value={shikiAdapter}>
                  <CodeBlock.Root
                    code={snippet}
                    language="javascript"
                    size="sm"
                    maxH="140px"
                    overflow="auto"
                    borderRadius="md"
                  >
                    <CodeBlock.Content>
                      <CodeBlock.Code>
                        <CodeBlock.CodeText />
                      </CodeBlock.Code>
                    </CodeBlock.Content>
                  </CodeBlock.Root>
                </CodeBlock.AdapterProvider>
              )}
            </Stack>
          </Card.Body>
        </Card.Root>
      );
    },
    [activeSampleId, shikiAdapter],
  );

  return (
    <Box overflowY="auto">
      <Stack gap={4} align="flex-start">
        <Box w="full">
          <HStack gap={3} align="center" flexWrap="wrap">
            <Dialog.Root
              open={browseOpen}
              onOpenChange={(e) => setBrowseOpen(e.open)}
              placement="center"
              lazyMount
              size="xl"
              scrollBehavior="inside"
            >
              <Dialog.Trigger asChild>
                <Button variant="outline" size="sm" aria-label="Browse code samples">
                  Browse Samples
                </Button>
              </Dialog.Trigger>

              <Dialog.Root
                open={v8BrowseOpen}
                onOpenChange={(e) => setV8BrowseOpen(e.open)}
                placement="center"
                lazyMount
                size="xl"
                scrollBehavior="inside"
              >
                <Dialog.Trigger asChild>
                  <Button variant="outline" size="sm" aria-label="Browse V8 internals samples">
                    V8 Internals
                  </Button>
                </Dialog.Trigger>

                <Portal>
                  <Dialog.Backdrop />
                  <Dialog.Positioner>
                    <Dialog.Content borderRadius="xl" border="1px solid" borderColor="#334155">
                      <Dialog.Header>
                        <Dialog.Title>V8 Internals</Dialog.Title>
                        <Dialog.CloseTrigger asChild>
                          <CloseButton size="sm" aria-label="Close V8 internals dialog" />
                        </Dialog.CloseTrigger>
                      </Dialog.Header>
                      <Dialog.Body>
                        <Stack gap={4}>
                          <Text fontSize="sm" color="gray.400">
                            Examples exploring V8 engine internals: element kinds, hidden classes, inline caches, and
                            bytecode. Run with&nbsp;
                            <Code>--allow-natives-syntax</Code>
                            &nbsp;or&nbsp;
                            <Code>--print-bytecode</Code>
                            &nbsp;as noted in each sample.
                          </Text>
                          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
                            {v8SampleCatalog.map(({ key, label, description }) =>
                              renderSampleCard({
                                id: `v8:${key}`,
                                title: label,
                                description,
                                snippet: v8Samples[key],
                                onClick: () => handleSelectV8(key),
                              }),
                            )}
                          </SimpleGrid>
                        </Stack>
                      </Dialog.Body>
                    </Dialog.Content>
                  </Dialog.Positioner>
                </Portal>
              </Dialog.Root>

              <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                  <Dialog.Content borderRadius="xl" border="1px solid" borderColor="#334155">
                    <Dialog.Header>
                      <Dialog.Title>Select a sample</Dialog.Title>
                      <Dialog.CloseTrigger asChild>
                        <CloseButton size="sm" aria-label="Close samples dialog" />
                      </Dialog.CloseTrigger>
                    </Dialog.Header>

                    <Dialog.Body>
                      <Stack gap={6}>
                        {customSamples.length > 0 && (
                          <Box>
                            <Separator mb={4} />
                            <Text fontSize="xs" textTransform="uppercase" fontWeight="semibold" color="gray.400" mb={2}>
                              Saved samples
                            </Text>
                            <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
                              {customSamples.map((sample) =>
                                renderSampleCard({
                                  id: sample.id,
                                  title: sample.name,
                                  description: sample.description?.trim() || "Custom snippet",
                                  snippet: sample.code,
                                  onClick: () => handleSelectCustom(sample),
                                  actions: (
                                    <>
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          openRenameDialog(sample);
                                        }}
                                      >
                                        Rename
                                      </Button>
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        colorScheme="red"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          openDeleteDialog(sample);
                                        }}
                                      >
                                        Delete
                                      </Button>
                                    </>
                                  ),
                                }),
                              )}
                            </SimpleGrid>
                          </Box>
                        )}
                        <Box>
                          <Text fontSize="xs" textTransform="uppercase" fontWeight="semibold" color="gray.400" mb={2}>
                            Default samples
                          </Text>
                          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
                            {sampleCatalog.map(({ key, label, description }) =>
                              renderSampleCard({
                                id: `default:${key}`,
                                title: label,
                                description,
                                snippet: samples[key],
                                onClick: () => handleSelectDefault(key),
                              }),
                            )}
                          </SimpleGrid>
                        </Box>

                        {customSamples.length === 0 && (
                          <Text fontSize="sm" color="gray.400">
                            Save your own snippets to access them here quickly.
                          </Text>
                        )}
                      </Stack>
                    </Dialog.Body>
                  </Dialog.Content>
                </Dialog.Positioner>
              </Portal>
            </Dialog.Root>

            <Presence
              present={canSave}
              animationName={{
                _open: "slide-from-bottom, fade-in",
                _closed: "slide-to-bottom, fade-out",
              }}
              animationDuration="moderate"
            >
              <Button size="sm" colorScheme="blue" variant="solid" onClick={openSaveDialog}>
                Save Sample
              </Button>
            </Presence>
          </HStack>
        </Box>
      </Stack>

      <Dialog.Root
        open={Boolean(renameTarget)}
        onOpenChange={(event) => {
          if (!event.open) {
            closeRenameDialog();
          }
        }}
        placement="center"
        lazyMount
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content borderRadius="lg" border="1px solid" borderColor="#334155" maxW="400px">
              <Dialog.Header>
                <Dialog.Title>Rename snippet</Dialog.Title>
                <Dialog.CloseTrigger asChild>
                  <CloseButton size="sm" aria-label="Close rename dialog" />
                </Dialog.CloseTrigger>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap={3}>
                  <Input
                    placeholder="Sample name"
                    value={renameName}
                    onChange={(event) => {
                      setRenameName(event.target.value);
                      setRenameError(null);
                    }}
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={renameDescription}
                    onChange={(event) => setRenameDescription(event.target.value)}
                    minH="100px"
                    resize="vertical"
                  />
                  {renameError && (
                    <Text fontSize="sm" color="red.400">
                      {renameError}
                    </Text>
                  )}
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                <HStack justify="flex-end" gap={2}>
                  <Button variant="ghost" size="sm" onClick={closeRenameDialog}>
                    Cancel
                  </Button>
                  <Button size="sm" colorScheme="blue" onClick={handleRenameSample}>
                    Save
                  </Button>
                </HStack>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(deleteTarget)}
        onOpenChange={(event) => {
          if (!event.open) {
            closeDeleteDialog();
          }
        }}
        placement="center"
        lazyMount
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content borderRadius="lg" border="1px solid" borderColor="#334155" maxW="400px">
              <Dialog.Header>
                <Dialog.Title>Delete snippet</Dialog.Title>
                <Dialog.CloseTrigger asChild>
                  <CloseButton size="sm" aria-label="Close delete dialog" />
                </Dialog.CloseTrigger>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap={3}>
                  <Text fontSize="sm">
                    Are you sure you want to delete{" "}
                    <Text as="span" fontWeight="semibold">
                      {deleteTarget?.name}
                    </Text>
                    ? This action cannot be undone.
                  </Text>
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                <HStack justify="flex-end" gap={2}>
                  <Button variant="ghost" size="sm" onClick={closeDeleteDialog}>
                    Cancel
                  </Button>
                  <Button size="sm" colorScheme="red" onClick={handleDeleteSample}>
                    Delete
                  </Button>
                </HStack>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <Dialog.Root open={saveOpen} onOpenChange={(e) => setSaveOpen(e.open)} placement="center" lazyMount>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content borderRadius="lg" border="1px solid" borderColor="#334155" maxW="400px">
              <Dialog.Header>
                <Dialog.Title>Save current snippet</Dialog.Title>
                <Dialog.CloseTrigger asChild>
                  <CloseButton size="sm" aria-label="Close save dialog" />
                </Dialog.CloseTrigger>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap={3}>
                  <Input
                    placeholder="Sample name"
                    value={saveName}
                    onChange={(event) => {
                      setSaveName(event.target.value);
                      setSaveError(null);
                    }}
                  />
                  {saveError && (
                    <Text fontSize="sm" color="red.400">
                      {saveError}
                    </Text>
                  )}
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                <HStack justify="flex-end" gap={2}>
                  <Button variant="ghost" size="sm" onClick={closeSaveDialog}>
                    Cancel
                  </Button>
                  <Button size="sm" colorScheme="blue" onClick={handleSaveSample}>
                    Save
                  </Button>
                </HStack>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  );
}

export default Samples;
