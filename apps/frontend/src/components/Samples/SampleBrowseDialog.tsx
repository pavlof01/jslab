"use client";

import { useState, type ReactNode } from "react";
import { Button, CloseButton, Dialog, Portal, Stack } from "@chakra-ui/react";

export function SampleBrowseDialog({
  triggerLabel,
  triggerLabelForScreenReader,
  title,
  children,
}: {
  triggerLabel: string;
  triggerLabelForScreenReader: string;
  title: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(event) => setOpen(event.open)}
      placement="center"
      lazyMount
      unmountOnExit
      size="xl"
      scrollBehavior="inside"
    >
      <Dialog.Trigger asChild>
        <Button size="sm" aria-label={triggerLabelForScreenReader}>
          {triggerLabel}
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" aria-label={`Close ${title.toLowerCase()} dialog`} />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap={6}>{children(() => setOpen(false))}</Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
