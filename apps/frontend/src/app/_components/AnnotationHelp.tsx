"use client";

import { Box, Button, Flex, Link, Popover, Portal, Text } from "@chakra-ui/react";
import { useState } from "react";

import { ANNOTATION_TEMPLATE } from "@/lib/annotations";
import { samples } from "@/lib/samples";
import { ANNOTATIONS_GUIDE_URL } from "@/lib/site";
import { useCode, useSetCode } from "@/store/engineOutputsSelectors";

const AnnotationHelp: React.FC = () => {
  const [open, setOpen] = useState(false);
  const code = useCode();
  const setCode = useSetCode();

  const insertTemplate = () => {
    setCode(code.trim() ? `${ANNOTATION_TEMPLATE}\n${code}` : `${ANNOTATION_TEMPLATE}\n`);
    setOpen(false);
  };

  const loadExample = () => {
    setCode(samples.annotations);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={({ open }) => setOpen(open)} lazyMount unmountOnExit>
      <Popover.Trigger asChild>
        <Button variant="quiet" size="xs" aria-label="How to annotate the output">
          annotations ?
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content maxW="min(420px, calc(100vw - 32px))">
            <Popover.Arrow>
              <Popover.ArrowTip />
            </Popover.Arrow>
            <Popover.Body display="flex" flexDirection="column" gap={3}>
              <Popover.Title textStyle="label">Explain the output</Popover.Title>
              <Text textStyle="bodySm" color="ink.2">
                Put a comment like this in your code and run it. The matching output gets a frame;
                clicking it opens your note. Notes travel with share links and embeds.
              </Text>
              <Box
                as="pre"
                textStyle="codeSm"
                color="ink.1"
                bg="surface.band"
                p={2}
                rounded="md"
                overflowX="auto"
                m={0}
              >
                {ANNOTATION_TEMPLATE}
              </Box>
              <Flex gap={2} wrap="wrap" align="center">
                <Button size="xs" variant="primary" onClick={insertTemplate}>
                  Insert template
                </Button>
                <Button size="xs" onClick={loadExample}>
                  Load example
                </Button>
                <Link
                  href={ANNOTATIONS_GUIDE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  textStyle="bodySm"
                  color="accent"
                >
                  Full guide
                </Link>
              </Flex>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
};

export default AnnotationHelp;
