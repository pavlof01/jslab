import { V8FlagOption } from "@/lib/types";
import { Box, Button, Checkbox, CheckboxGroup, CloseButton, Dialog, For, Portal, Stack, Text } from "@chakra-ui/react";
import React, { Dispatch, SetStateAction, useMemo } from "react";
import { useColorModeValue } from "../ui/color-mode";

const v8FlagOptions: V8FlagOption[] = [
  {
    flag: "--allow-natives-syntax",
    label: "allow-natives-syntax",
    description:
      "Permit use of V8 internal %intrinsics from user JS, unlocking debugging helpers like %OptimizeFunctionOnNextCall.",
  },
  {
    flag: "--print-bytecode",
    label: "print-bytecode",
    description:
      "Emit the interpreter bytecode for each executed function, including register layout and handler dispatch.",
  },
  {
    flag: "--print-ast",
    label: "print-ast",
    description:
      "Dump the abstract syntax tree produced by the parser so you can inspect how V8 understood the source.",
  },
  {
    flag: "--print-code",
    label: "print-code",
    description:
      "Disassemble every piece of machine code V8 generates, covering baseline and optimised tiers.",
  },
  {
    flag: "--print-opt-code",
    label: "print-opt-code",
    description:
      "Emit only the optimised machine code produced by TurboFan when hot functions tier-up.",
  },
  {
    flag: "--print-regexp-bytecode",
    label: "print-regexp-bytecode",
    description:
      "Log the bytecode emitted by V8's regexp interpreter for each compiled pattern.",
  },
  {
    flag: "--print-regexp-code",
    label: "print-regexp-code",
    description:
      "Disassemble the native code generated for regular expressions when they are JIT compiled.",
  },
  {
    flag: "--trace-opt",
    label: "trace-opt",
    description:
      "Trace when functions move through the optimisation pipeline and why they are selected for optimisation.",
  },
  {
    flag: "--trace-opt-verbose",
    label: "trace-opt-verbose",
    description:
      "Produce a verbose optimisation trace that includes IR reductions, inlining choices, and pipeline timing.",
  },
  {
    flag: "--trace-deopt",
    label: "trace-deopt",
    description:
      "Log every deoptimisation, including the bailout reason, source position, and reconstructed frame state.",
  },
  {
    flag: "--trace-ic",
    label: "trace-ic",
    description:
      "Trace inline cache updates so you can see when property accesses transition from monomorphic to megamorphic.",
  },
];

type Props = {
  selectedV8Flags: string[];
  setSelectedV8Flags: Dispatch<SetStateAction<string[]>>;
};

function V8FlagSelector({ selectedV8Flags, setSelectedV8Flags }: Props) {
  const descriptionColor = useColorModeValue("#64748b", "#94a3b8");

  const displayLabel = useMemo(() => {
    if (!selectedV8Flags || selectedV8Flags.length === 0) return "None";
    if (selectedV8Flags.length === 1) return selectedV8Flags[0];
    const [first, second, ...rest] = selectedV8Flags;
    return rest.length > 0 ? `${first}, ${second} +${rest.length}` : `${first}, ${second}`;
  }, [selectedV8Flags]);

  return (
    <Dialog.Root placement="center" size="lg">
      <Dialog.Trigger asChild>
        <Button variant="solid" size="sm">
          V8 Flags: {displayLabel}
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Select V8 Flags</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <CheckboxGroup value={selectedV8Flags} onValueChange={(values) => setSelectedV8Flags(values as string[])}>
                <Stack gap={3}>
                  <For each={v8FlagOptions}>
                    {(option) => (
                      <Checkbox.Root key={option.flag} value={option.flag} alignItems="flex-start">
                        <Checkbox.HiddenInput />
                        <Checkbox.Control mt="1" />
                        <Checkbox.Label>
                          <Box>
                            <Text fontWeight="semibold">{option.flag}</Text>
                            <Text fontSize="sm" color={descriptionColor}>
                              {option.description}
                            </Text>
                          </Box>
                        </Checkbox.Label>
                      </Checkbox.Root>
                    )}
                  </For>
                </Stack>
              </CheckboxGroup>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

export default V8FlagSelector;
