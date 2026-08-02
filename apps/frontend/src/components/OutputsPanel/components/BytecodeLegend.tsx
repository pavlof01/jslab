"use client";

import { Box, CloseButton, HStack, Table, Text } from "@chakra-ui/react";

import { useLocalStorage } from "@/hooks/useLocalStorage";

// A d8 --print-bytecode line packs five unlabelled columns into one row, e.g.
//   34 S> 0x2a1b00040226 @    0 : 0b 03    Ldar a1
const COLUMNS: { sample: string; meaning: string }[] = [
  { sample: "34 S>", meaning: "Source byte offset. S> starts a statement, E> an expression." },
  { sample: "0x2a1b…", meaning: "Address of the bytecode array in the heap — differs on every run." },
  { sample: "@ 0", meaning: "Offset of this instruction inside the bytecode array; jumps target these." },
  { sample: "0b 03", meaning: "Raw bytes: the opcode followed by its operands." },
  { sample: "Ldar a1", meaning: "Mnemonic and operands — aN parameters, rN registers, [n] pool slots." },
];

/**
 * Explains the V8 bytecode columns once. Dismissal is remembered so returning
 * users are not taught the same table on every visit.
 */
const BytecodeLegend: React.FC = () => {
  const [dismissed, setDismissed] = useLocalStorage("v8-bytecode-legend-dismissed", false);

  if (dismissed) return null;

  return (
    <Box bg="brandAlpha.50" borderRadius="md" px={4} py={3}>
      <HStack justify="space-between" align="start" mb={2}>
        <Text fontSize="xs" fontWeight="700" color="brand.300">
          Reading a V8 bytecode line
        </Text>
        <CloseButton size="xs" aria-label="Dismiss bytecode legend" onClick={() => setDismissed(true)} />
      </HStack>
      <Table.Root size="sm" variant="outline" bg="transparent">
        <Table.Body>
          {COLUMNS.map((column) => (
            <Table.Row key={column.sample} bg="transparent">
              <Table.Cell fontFamily="mono" fontSize="xs" color="whiteAlpha.800" whiteSpace="nowrap" py={1}>
                {column.sample}
              </Table.Cell>
              <Table.Cell fontSize="xs" color="whiteAlpha.500" py={1}>
                {column.meaning}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
};

export default BytecodeLegend;
