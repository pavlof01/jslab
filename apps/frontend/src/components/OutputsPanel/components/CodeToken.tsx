import { Button, Popover, Portal, Text } from "@chakra-ui/react";
import type { CSSProperties, ReactNode } from "react";
import { useState, useEffect, useCallback } from "react";
import type { ThemedToken } from "shiki";
import { getTokenInfo as getJscTokenInfo } from "../jsc-opcodes";
import { getTokenInfo as getHermesTokenInfo } from "../hermes-opcodes";
import { getTokenInfo as getSmTokenInfo } from "../spidermonkey-opcodes";
import { getOpcodeInfo as getV8OpcodeInfo } from "../v8-opcodes";
import type { EngineKey } from "@/lib/types";

type Props = {
  token: ThemedToken;
  nextToken?: ThemedToken;
  engineKey: EngineKey;
};

function ClickPopoverToken({ content, description }: { content: ReactNode; description: string }) {
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
}

const TokenSpan: React.FC<Props> = ({ token, nextToken, engineKey }) => {
  const style: CSSProperties = {
    color: token.color ?? "inherit",
    whiteSpace: "pre",
  };

  if (token.fontStyle) {
    if (token.fontStyle & 1) style.fontStyle = "italic";
    if (token.fontStyle & 2) style.fontWeight = "bold";
    if (token.fontStyle & 4) style.textDecoration = "underline";
  }

  const tokenKey = token.content?.trim();
  const description = (() => {
    if (!tokenKey) return undefined;
    if (engineKey === "v8") return getV8OpcodeInfo(tokenKey);
    if (engineKey === "jsc") return getJscTokenInfo(tokenKey, { nextToken: nextToken?.content ?? null });
    if (engineKey === "hermes") return getHermesTokenInfo(tokenKey, { nextToken: nextToken?.content ?? null });
    if (engineKey === "sm") return getSmTokenInfo(tokenKey, { nextToken: nextToken?.content ?? null });
    return undefined;
  })();

  const content = (
    <Text as="span" fontSize={14} style={style}>
      {token.content}
    </Text>
  );

  if (!description) {
    return content;
  }

  return <ClickPopoverToken content={content} description={description} />;
};

export default TokenSpan;
