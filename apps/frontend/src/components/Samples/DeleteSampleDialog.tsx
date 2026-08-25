"use client";

import { Button, CloseButton, Dialog, HStack, Portal, Text } from "@chakra-ui/react";

import type { CustomSample } from "@/lib/customSamples";

type Props = {
  target: CustomSample | null;
  onDismiss: () => void;
  onConfirm: (sample: CustomSample) => void;
};

const DeleteSampleDialog: React.FC<Props> = ({ target, onDismiss, onConfirm }) => {
  return (
    <Dialog.Root
      open={target !== null}
      onOpenChange={(event) => !event.open && onDismiss()}
      placement="center"
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="400px">
            <Dialog.Header>
              <Dialog.Title>Delete snippet</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" aria-label="Close delete dialog" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <Text fontSize="sm">
                Delete{" "}
                <Text as="span" fontWeight="semibold">
                  {target?.name}
                </Text>
                ? This cannot be undone.
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <HStack justify="flex-end" gap={2}>
                <Button variant="ghost" size="sm" onClick={onDismiss}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={() => target && onConfirm(target)}>
                  Delete
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default DeleteSampleDialog;
