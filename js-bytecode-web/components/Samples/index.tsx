import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CloseButton,
  CodeBlock,
  createShikiAdapter,
  Dialog,
  HStack,
  Portal,
  SimpleGrid,
  Stack,
} from "@chakra-ui/react";
import { useColorModeValue } from "../ui/color-mode";
import type { HighlighterGeneric } from "shiki";

export const samples = {
  add: `function f(x){ return x + 1 }\nf(41);`,
  closure: `function f(a){ function g(b){ return a + b } return g(1) }\nf(41);`,
  loop: `function f(n){ let s=0; for(let i=0;i<n;i++) s+=i; return s }\nf(10);`,
  try: `function f(){ try { throw 1 } catch(e){ return e + 1 } }\nf();`,
  d8Native: `function hot(x){ return x + 1; }\nfor (let i = 0; i < 5000; i++) hot(i);\nif (typeof globalThis.d8 !== "undefined") {\n  try { eval('%OptimizeFunctionOnNextCall(hot);'); } catch {}\n}\nprint('hot(41)=', hot(41));`,
  typedarray: `const buffer = new ArrayBuffer(16);\nconst view = new DataView(buffer);\nview.setUint32(0, 0xdeadbeef, true);\nview.setFloat64(8, Math.PI, true);\nconst bytes = Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0'));\nprint('buffer bytes:', bytes.join(' '));\nprint('float64:', view.getFloat64(8, true).toFixed(6));`,
  asyncFlow: `async function loadUser(id){\n  return { id, name: 'user-' + id };\n}\nasync function main(){\n  const users = await Promise.all([1, 2, 3].map((id) => loadUser(id)));\n  const names = users.map((u) => u.name).join(', ');\n  print('async users:', names);\n}\nmain();`,
  generator: `function* fibonacci(limit){\n  let a = 0, b = 1;\n  while (limit-- > 0) {\n    yield a;\n    [a, b] = [b, a + b];\n  }\n}\nprint('fib:', [...fibonacci(8)].join(', '));`,
};

export type SampleKey = keyof typeof samples;
export type SampleDescriptor = { key: SampleKey; label: string; description: string };

export const sampleCatalog: SampleDescriptor[] = [
  { key: "add", label: "Add", description: "Minimal function call returning 42." },
  { key: "closure", label: "Closure", description: "Capturing outer scope and invoking inner function." },
  { key: "loop", label: "Loop", description: "Simple for-loop summing integer range." },
  { key: "try", label: "Try/catch", description: "Exception handling flow returning a computed value." },
  { key: "d8Native", label: "d8 native", description: "Uses V8 % intrinsics to optimise a hot function." },
  { key: "typedarray", label: "Typed arrays", description: "Manipulates ArrayBuffer via DataView, prints bytes." },
  { key: "asyncFlow", label: "Async flow", description: "Async/await fetching mock users in parallel." },
  { key: "generator", label: "Generator", description: "Generates Fibonacci numbers via iterator." },
];

type Props = {
  onSelectSample: (key: SampleKey) => void;
};

function Samples({ onSelectSample }: Props) {
  const [open, setOpen] = useState(false);

  // лениво создаём Shiki-адаптер только когда открыт диалог
  const shikiAdapter = useMemo(() => {
    if (!open) return null;
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
  }, [open]);

  const borderColor = useColorModeValue("#e2e8f0", "#334155");
  const hoverBg = useColorModeValue("gray.100", "gray.800");

  return (
    <Box px={5} pt={4} pb={2} overflowY="auto">
      <Stack gap={4} align="flex-start">
        <Box w="full">
          <HStack gap={4} align="center" flexWrap="wrap">
            <Dialog.Root
              open={open}
              onOpenChange={(e) => setOpen(e.open)}
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

              <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                  <Dialog.Content borderRadius="xl" border="1px solid" borderColor={borderColor}>
                    <Dialog.Header>
                      <Dialog.Title>Select a sample</Dialog.Title>
                      <Dialog.CloseTrigger asChild>
                        <CloseButton size="sm" aria-label="Close samples dialog" />
                      </Dialog.CloseTrigger>
                    </Dialog.Header>

                    <Dialog.Body>
                      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
                        {sampleCatalog.map(({ key, label, description }) => (
                          <Card.Root
                            key={key}
                            width="100%"
                            size="sm"
                            role="button"
                            aria-label={`Select ${label} sample`}
                            _hover={{ backgroundColor: hoverBg, cursor: "pointer" }}
                            onClick={() => {
                              onSelectSample(key);
                              setOpen(false);
                            }}
                          >
                            <Card.Body>
                              <Card.Title>{label}</Card.Title>
                              <Card.Description>{description}</Card.Description>

                              {shikiAdapter && (
                                <CodeBlock.AdapterProvider value={shikiAdapter}>
                                  <CodeBlock.Root
                                    code={samples[key]}
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
                            </Card.Body>
                          </Card.Root>
                        ))}
                      </SimpleGrid>
                    </Dialog.Body>
                  </Dialog.Content>
                </Dialog.Positioner>
              </Portal>
            </Dialog.Root>
          </HStack>
        </Box>
      </Stack>
    </Box>
  );
}

export default Samples;
