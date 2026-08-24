"use client";

import {
  Button,
  CloseButton,
  Dialog,
  HStack,
  Input,
  Portal,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useState } from "react";

import { type CustomSample, NAME_ERROR_TEXT, validateName } from "@/lib/customSamples";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  confirmLabel: string;
  samples: readonly CustomSample[];
  editing?: CustomSample;
  withDescription?: boolean;
  onConfirm: (name: string, description: string) => void;
};

export function SampleNameDialog(props: Props) {
  return <NameForm key={`${props.open}:${props.editing?.id ?? "new"}`} {...props} />;
}

function NameForm({
  open,
  onOpenChange,
  title,
  confirmLabel,
  samples,
  editing,
  withDescription = false,
  onConfirm,
}: Props) {
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [error, setError] = useState<string | null>(null);

  const confirm = () => {
    const problem = validateName(name, samples, editing?.id);
    if (problem) {
      setError(NAME_ERROR_TEXT[problem]);
      return;
    }
    onConfirm(name.trim(), description.trim());
    onOpenChange(false);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      placement="center"
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="400px">
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" aria-label={`Close ${title.toLowerCase()} dialog`} />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap={3}>
                <Input
                  placeholder="Sample name"
                  value={name}
                  autoFocus
                  onChange={(event) => {
                    setName(event.target.value);
                    setError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") confirm();
                  }}
                />
                {withDescription && (
                  <Textarea
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    minH="100px"
                    resize="vertical"
                  />
                )}
                {error && (
                  <Text fontSize="sm" color="status.error">
                    {error}
                  </Text>
                )}
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <HStack justify="flex-end" gap={2}>
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={confirm}>
                  {confirmLabel}
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
