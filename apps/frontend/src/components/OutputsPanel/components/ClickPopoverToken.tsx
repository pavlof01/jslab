import { Button, Popover, Portal, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { useState, useEffect, useCallback } from "react";

type Props = {
  content: ReactNode;
  description: string;
};

const ClickPopoverToken: React.FC<Props> = ({ content, description }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", close, { capture: true });
  }, [open]);

  const onOpenChange = useCallback((details: { open: boolean }) => {
    setOpen(details.open);
  }, []);

  return (
    <Popover.Root lazyMount unmountOnExit open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <Button as="span" size="2xs" fontSize={14} variant="ghost">
          {content}
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Arrow>
              <Popover.ArrowTip />
            </Popover.Arrow>
            <Popover.Body>
              <Popover.Title fontWeight="medium">{content}</Popover.Title>
              <Text as="span" whiteSpace="pre-wrap">
                {description}
              </Text>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
};

export default ClickPopoverToken;
