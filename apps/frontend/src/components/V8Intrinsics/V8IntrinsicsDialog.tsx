"use client";

import { Button, CloseButton, Dialog, Portal } from "@chakra-ui/react";

type Props = { children: React.ReactNode };

const V8IntrinsicsDialog: React.FC<Props> = ({ children }) => {
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
              {children}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default V8IntrinsicsDialog;
