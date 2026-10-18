"use client";

import { Popover, Portal, Text } from "@chakra-ui/react";
import type { ReactElement, ReactNode } from "react";
import { useEffect, useId, useState } from "react";

export type ClickPopoverProps = {
  children: ReactElement;
  title: ReactNode;
  content: ReactNode;
};

const ClickPopover: React.FC<ClickPopoverProps> = ({ children, title, content }) => {
  const [open, setOpen] = useState(false);
  // Chakra renders the title but does not point the dialog at it, which leaves
  // the popover without an accessible name.
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("scroll", close, { passive: true, capture: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <Popover.Root lazyMount unmountOnExit open={open} onOpenChange={({ open }) => setOpen(open)}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content aria-labelledby={titleId}>
            <Popover.Arrow>
              <Popover.ArrowTip />
            </Popover.Arrow>
            <Popover.Body>
              <Popover.Title id={titleId} fontWeight="medium">
                {title}
              </Popover.Title>
              <Text as="span" whiteSpace="pre-wrap">
                {content}
              </Text>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
};

export default ClickPopover;
