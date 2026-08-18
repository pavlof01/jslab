import { Box, Button, CloseButton, Code, Dialog, For, Link, Portal, Table, Tabs, Text } from "@chakra-ui/react";

import { INTRINSIC_CATEGORIES, intrinsicsByCategory, V8_NATIVES_FLAG } from "@/lib/v8Intrinsics";

function V8Intrinsics() {
  return (
    <Dialog.Root placement="center" size="lg" lazyMount unmountOnExit>
      <Dialog.Trigger asChild>
        <Button size="sm" aria-label="V8 intrinsics reference">
          intrinsics
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content width="860px" maxW="90vw" height="640px" maxH="90vh">
            <Dialog.Header px={4} py={3}>
              <Dialog.Title>V8 intrinsics</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" aria-label="Close intrinsics reference" />
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body overflowY="auto" px={4} pb={4} pt={4}>
              <Box mb={5} color="ink.2" fontSize="sm" lineHeight="tall">
                <Text mb={1}>
                  V8&apos;s own test hooks, grouped by purpose. Every one of them needs{" "}
                  <Code>{V8_NATIVES_FLAG}</Code>, which the flag selector next door turns on.
                </Text>
                <Link
                  data-jsl="link"
                  fontSize="sm"
                  href="https://github.com/v8/v8/blob/main/src/runtime/runtime.h"
                  target="_blank"
                  rel="noreferrer"
                >
                  Full list in runtime.h ↗
                </Link>
              </Box>

              <Tabs.Root defaultValue={INTRINSIC_CATEGORIES[0]} lazyMount>
                <Tabs.List mb={4} overflowX="auto">
                  <For each={INTRINSIC_CATEGORIES}>
                    {(category) => (
                      <Tabs.Trigger key={category} value={category}>
                        {category}
                      </Tabs.Trigger>
                    )}
                  </For>
                </Tabs.List>

                <For each={INTRINSIC_CATEGORIES}>
                  {(category) => (
                    <Tabs.Content key={category} value={category}>
                      <Box overflowX="auto">
                        <Table.Root size="sm" showColumnBorder>
                          <Table.Header>
                            <Table.Row>
                              <Table.ColumnHeader width="26%">Intrinsic</Table.ColumnHeader>
                              <Table.ColumnHeader>What it does</Table.ColumnHeader>
                              <Table.ColumnHeader width="30%">Invocation</Table.ColumnHeader>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {intrinsicsByCategory(category).map((intrinsic) => (
                              <Table.Row key={intrinsic.name}>
                                <Table.Cell fontFamily="mono" color="ink.1">
                                  %{intrinsic.name}
                                </Table.Cell>
                                <Table.Cell color="ink.2">{intrinsic.description}</Table.Cell>
                                <Table.Cell>
                                  <Code whiteSpace="pre-wrap" padding={2}>
                                    {intrinsic.snippet}
                                  </Code>
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
