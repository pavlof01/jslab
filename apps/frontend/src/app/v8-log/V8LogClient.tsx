"use client";

import { useCallback, useRef, useState } from "react";
import { Badge, Box, Button, Flex, Heading, HStack, Table, Text, VStack } from "@chakra-ui/react";
import { LuUpload } from "react-icons/lu";

import { parseV8Log, type V8LogSummary } from "@/lib/parseV8Log";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB guard for the in-browser parse.

export default function V8LogClient() {
  const [summary, setSummary] = useState<V8LogSummary | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ingest = useCallback(async (file: File) => {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError(`File is ${(file.size / 1024 / 1024).toFixed(1)} MB — too large to parse in the browser (max 25 MB).`);
      return;
    }
    try {
      const text = await file.text();
      setSummary(parseV8Log(text));
      setFileName(file.name);
    } catch {
      setError("Could not read that file.");
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void ingest(file);
    },
    [ingest],
  );

  const pct = (share: number) => `${(share * 100).toFixed(1)}%`;

  return (
    <Box maxW="5xl" mx="auto" px={{ base: 4, md: 6 }} py={8}>
      <Heading as="h1" size="lg" mb={2}>
        v8.log profiler viewer
      </Heading>
      <Text color="whiteAlpha.600" fontSize="sm" mb={6}>
        Drop a <Text as="code">v8.log</Text> (from <Text as="code">d8 --prof</Text> or{" "}
        <Text as="code">node --prof</Text>). Parsing happens entirely in your browser — nothing is uploaded.
      </Text>

      <Box
        role="button"
        tabIndex={0}
        aria-label="Upload v8.log file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        border="2px dashed"
        borderColor={dragging ? "brand.400" : "whiteAlpha.300"}
        bg={dragging ? "whiteAlpha.100" : "transparent"}
        borderRadius="lg"
        py={10}
        textAlign="center"
        cursor="pointer"
        transition="all 0.15s"
      >
        <VStack gap={2}>
          <LuUpload size={24} />
          <Text fontSize="sm" color="whiteAlpha.700">
            {fileName ? `Loaded: ${fileName}` : "Click or drop a v8.log here"}
          </Text>
        </VStack>
        <input
          ref={inputRef}
          type="file"
          accept=".log,text/plain"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void ingest(file);
          }}
        />
      </Box>

      {error && (
        <Box role="alert" mt={4} px={3} py={2} bg="red.950" border="1px solid" borderColor="red.800" borderRadius="md" color="red.300" fontSize="sm">
          {error}
        </Box>
      )}

      {summary && (
        <VStack align="stretch" gap={6} mt={8}>
          <HStack gap={3} wrap="wrap">
            <Badge colorPalette="blue">{summary.totalTicks} ticks</Badge>
            <Badge colorPalette="gray">{summary.attributedTicks} attributed</Badge>
            <Badge colorPalette="red">{summary.deopts} deopts</Badge>
            {summary.totalTicks === 0 && (
              <Text fontSize="xs" color="whiteAlpha.500">
                No tick samples found — was the log produced with --prof?
              </Text>
            )}
          </HStack>

          {summary.hottest.length > 0 && (
            <Box>
              <Heading as="h2" size="sm" mb={2}>
                Hottest functions (by sampled self-time)
              </Heading>
              <Table.Root size="sm" variant="outline">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Function</Table.ColumnHeader>
                    <Table.ColumnHeader>Type</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Ticks</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Share</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {summary.hottest.map((r) => (
                    <Table.Row key={`${r.name}-${r.type}`}>
                      <Table.Cell fontFamily="mono" fontSize="xs">
                        {r.name}
                      </Table.Cell>
                      <Table.Cell fontSize="xs" color="whiteAlpha.600">
                        {r.type}
                      </Table.Cell>
                      <Table.Cell textAlign="end">{r.ticks}</Table.Cell>
                      <Table.Cell textAlign="end">{pct(r.share)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          )}

          {summary.largestCode.length > 0 && (
            <Box>
              <Heading as="h2" size="sm" mb={2}>
                Largest generated code
              </Heading>
              <Table.Root size="sm" variant="outline">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Function</Table.ColumnHeader>
                    <Table.ColumnHeader>Type</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Bytes</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {summary.largestCode.map((r) => (
                    <Table.Row key={`${r.name}-${r.type}-${r.size}`}>
                      <Table.Cell fontFamily="mono" fontSize="xs">
                        {r.name}
                      </Table.Cell>
                      <Table.Cell fontSize="xs" color="whiteAlpha.600">
                        {r.type}
                      </Table.Cell>
                      <Table.Cell textAlign="end">{r.size.toLocaleString()}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          )}

          <Flex>
            <Button
              size="sm"
              variant="surface"
              onClick={() => {
                setSummary(null);
                setFileName(null);
              }}
            >
              Clear
            </Button>
          </Flex>
        </VStack>
      )}
    </Box>
  );
}
