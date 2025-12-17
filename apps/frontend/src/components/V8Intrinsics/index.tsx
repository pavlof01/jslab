import { Badge, Box, Button, CloseButton, Dialog, For, Link, Portal, Text, Table, Tabs, Code } from "@chakra-ui/react";
import { useColorModeValue } from "../ui/color-mode";
import { useMemo } from "react";

type IntrinsicCategory =
  | "Optimisation (plan/trigger)"
  | "Deoptimisation / transitions"
  | "Status / code analysis"
  | "Array & map inspection"
  | "Debug printing"
  | "Memory & snapshots";

type IntrinsicEntry = {
  category: IntrinsicCategory;
  name: string;
  description: string;
  snippet: string;
};

const INTRINSICS: IntrinsicEntry[] = [
  {
    category: "Optimisation (plan/trigger)",
    name: "PrepareFunctionForOptimization",
    description: "Creates a feedback vector and prepares the function for optimisation.",
    snippet: "%PrepareFunctionForOptimization(fn);",
  },
  {
    category: "Optimisation (plan/trigger)",
    name: "OptimizeFunctionOnNextCall",
    description: "Marks the function for TurboFan optimisation on the next call.",
    snippet: "%OptimizeFunctionOnNextCall(fn);\nfn(1);",
  },
  {
    category: "Optimisation (plan/trigger)",
    name: "OptimizeMaglevOnNextCall",
    description: "Same behaviour but for Maglev optimisation.",
    snippet: "%OptimizeMaglevOnNextCall(fn);\nfn(1);",
  },
  {
    category: "Optimisation (plan/trigger)",
    name: "FinalizeOptimization",
    description: "Waits for background optimisation work to finish.",
    snippet: "%FinalizeOptimization();",
  },
  {
    category: "Optimisation (plan/trigger)",
    name: "OptimizeOsr",
    description: "Forces an On-Stack Replacement optimisation within a running loop.",
    snippet: "%OptimizeOsr(fn);",
  },

  {
    category: "Deoptimisation / transitions",
    name: "DeoptimizeFunction",
    description: "Forcefully deoptimises the function.",
    snippet: "%DeoptimizeFunction(fn);",
  },
  {
    category: "Deoptimisation / transitions",
    name: "DeoptimizeNow",
    description: "Immediately deoptimises the current frame (shows up in trace-deopt output).",
    snippet: "%DeoptimizeNow();",
  },

  {
    category: "Status / code analysis",
    name: "GetOptimizationStatus",
    description: "Returns a bitmask describing the optimisation status of the function.",
    snippet: "%GetOptimizationStatus(fn);",
  },
  {
    category: "Status / code analysis",
    name: "DisassembleFunction",
    description: "Disassembles and prints the generated code (baseline or optimised tiers).",
    snippet: "%DisassembleFunction(fn);",
  },
  {
    category: "Status / code analysis",
    name: "ActiveTierIsTurbofan",
    description: "Checks whether the current active frame is executing TurboFan code.",
    snippet: "%ActiveTierIsTurbofan();",
  },
  {
    category: "Status / code analysis",
    name: "IsMaglevEnabled",
    description: "Checks whether Maglev optimisation is available.",
    snippet: "%IsMaglevEnabled();",
  },
  {
    category: "Status / code analysis",
    name: "IsTurbofanEnabled",
    description: "Checks whether TurboFan is enabled.",
    snippet: "%IsTurbofanEnabled();",
  },

  {
    category: "Array & map inspection",
    name: "HasFastElements",
    description: "Checks whether the object uses fast elements (fast array layout).",
    snippet: "%HasFastElements(arr);",
  },
  {
    category: "Array & map inspection",
    name: "HasPackedElements",
    description: "Determines whether the array is packed (no holes).",
    snippet: "%HasPackedElements(arr);",
  },
  {
    category: "Array & map inspection",
    name: "HasHoleyElements",
    description: "Determines whether the array is holey (contains holes).",
    snippet: "%HasHoleyElements(arr);",
  },
  {
    category: "Array & map inspection",
    name: "HaveSameMap",
    description: "Compares the hidden classes (maps) of two objects.",
    snippet: "%HaveSameMap(a, b);",
  },

  {
    category: "Debug printing",
    name: "DebugPrint",
    description: "Quickly prints a value via the runtime.",
    snippet: "%DebugPrint(x);",
  },
  {
    category: "Debug printing",
    name: "GlobalPrint",
    description: "Global print helper that avoids triggering GC.",
    snippet: "%GlobalPrint('hello');",
  },

  {
    category: "Memory & snapshots",
    name: "TakeHeapSnapshot",
    description: "Captures a heap snapshot for GC and memory-structure analysis.",
    snippet: "%TakeHeapSnapshot();",
  },
];

const CATEGORY_ORDER: IntrinsicCategory[] = [
  "Optimisation (plan/trigger)",
  "Deoptimisation / transitions",
  "Status / code analysis",
  "Array & map inspection",
  "Debug printing",
  "Memory & snapshots",
];

function V8Intrinsics() {
  const headerBg = useColorModeValue("gray.50", "gray.700");
  const borderColor = useColorModeValue("#e2e8f0", "#334155");
  const dialogBg = useColorModeValue("white", "gray.900");

  const groupedByCategory = useMemo(() => {
    const acc: Record<IntrinsicCategory, IntrinsicEntry[]> = {
      "Optimisation (plan/trigger)": [],
      "Deoptimisation / transitions": [],
      "Status / code analysis": [],
      "Array & map inspection": [],
      "Debug printing": [],
      "Memory & snapshots": [],
    };
    for (const item of INTRINSICS) acc[item.category].push(item);
    return acc;
  }, []);

  const categories = CATEGORY_ORDER.filter((c) => groupedByCategory[c] && groupedByCategory[c].length > 0);

  if (!categories.length) return null;

  return (
    <Dialog.Root placement="center" size="lg">
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm">
          V8 Intrinsics
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            borderRadius="2xl"
            border="1px solid"
            borderColor={borderColor}
            bg={dialogBg}
            boxShadow="xl"
            width="860px"
            maxW="90vw"
            height="640px"
            maxH="90vh"
            px={2}
          >
            <Dialog.Header px={4} pt={4} pb={2}>
              <Dialog.Title>V8 Intrinsics Reference</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body overflowY="auto" px={4} pb={4}>
              <Box mb={5} color={useColorModeValue("gray.600", "gray.300")} fontSize="sm" lineHeight="tall">
                <Text mb={1}>
                  Quickly explore V8&apos;s internal helpers grouped by their purpose. Available only with{" "}
                  <Box as="code">--allow-natives-syntax</Box>.
                </Text>
                <Link
                  marginY={1}
                  textStyle="md"
                  variant="underline"
                  href="https://github.com/v8/v8/blob/main/src/runtime/runtime.h"
                >
                  Full list of intrinsics
                </Link>
              </Box>

              <Tabs.Root defaultValue={categories[0]} lazyMount>
                <Tabs.List mb={4} overflowX="auto">
                  <For each={categories}>
                    {(category) => (
                      <Tabs.Trigger key={category} value={category}>
                        {category}
                      </Tabs.Trigger>
                    )}
                  </For>
                </Tabs.List>

                <For each={categories}>
                  {(category) => (
                    <Tabs.Content key={category} value={category}>
                      <Box overflowX="auto">
                        <Table.Root size="sm" showColumnBorder>
                          <Table.Header bg={headerBg}>
                            <Table.Row>
                              <Table.ColumnHeader width="20%">Intrinsic</Table.ColumnHeader>
                              <Table.ColumnHeader>Description</Table.ColumnHeader>
                              <Table.ColumnHeader width="36%">Invocation</Table.ColumnHeader>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {groupedByCategory[category].map((item) => (
                              <Table.Row key={item.name}>
                                <Table.Cell fontWeight="semibold">%{item.name}</Table.Cell>
                                <Table.Cell>{item.description}</Table.Cell>
                                <Table.Cell>
                                  <Code padding={2}>{item.snippet}</Code>
                                </Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table.Root>
                      </Box>
                    </Tabs.Content>
                  )}
                </For>
              </Tabs.Root>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

export default V8Intrinsics;
