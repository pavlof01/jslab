"use client";

import { Box, Button, DataList, Flex, Text } from "@chakra-ui/react";

import { useLocalStorage } from "@/hooks/useLocalStorage";

const COLUMNS: { sample: string; meaning: string }[] = [
  { sample: "34 S>", meaning: "Source byte offset. S> starts a statement, E> an expression." },
  { sample: "0x2a1b…", meaning: "Address of the bytecode array in the heap — differs on every run." },
  { sample: "@ 0", meaning: "Offset of this instruction inside the bytecode array; jumps target these." },
  { sample: "0b 03", meaning: "Raw bytes: the opcode followed by its operands." },
  { sample: "Ldar a1", meaning: "Mnemonic and operands — aN parameters, rN registers, [n] pool slots." },
];

const BytecodeLegend: React.FC = () => {
  const [dismissed, setDismissed] = useLocalStorage("v8-bytecode-legend-dismissed", false);

  if (dismissed) return null;

  return (
    <Box
      borderBottomWidth="1px"
      borderBottomColor="rule.row"
      borderLeftWidth="2px"
      borderLeftColor="rule.accentDim"
      bg="surface.accentSoft"
      pt="9px"
      pb="11px"
      px="clamp(10px, 1vw, 14px)"
    >
      <Flex wrap="wrap" align="baseline" justify="space-between" gap="4px 14px" mb="7px">
        <Text textStyle="label" as="span" color="ink.label">
          reading a V8 bytecode line
        </Text>
        <Button variant="quiet" fontSize="12px" onClick={() => setDismissed(true)} aria-label="Dismiss bytecode legend">
          ×
        </Button>
      </Flex>

      <DataList.Root display="grid" gap="3px" m={0}>
        {COLUMNS.map((column) => (
          <DataList.Item
            key={column.sample}
            display="grid"
            gridTemplateColumns="minmax(0, 86px) minmax(0, 1fr)"
            columnGap="12px"
            alignItems="baseline"
          >
            <DataList.ItemLabel
              textStyle="codeSm"
              color="ink.code"
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
            >
              {column.sample}
            </DataList.ItemLabel>
            <DataList.ItemValue textStyle="codeSm" m={0} lineHeight="1.5" color="ink.label" textWrap="pretty">
              {column.meaning}
            </DataList.ItemValue>
          </DataList.Item>
        ))}
      </DataList.Root>
    </Box>
  );
};

export default BytecodeLegend;
