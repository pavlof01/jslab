import { Tooltip } from "@/components/ui/tooltip";
import { Button, Popover, Portal, Text } from "@chakra-ui/react";
import type { CSSProperties } from "react";
import type { ThemedToken } from "shiki";
import { getTokenInfo as getJscTokenInfo } from "../jsc-opcodes";
import { getOpcodeInfo as getV8OpcodeInfo } from "../v8-opcodes";
import type { EngineKey } from "@/lib/types";

type Props = {
  token: ThemedToken;
  nextToken?: ThemedToken;
  engineKey: EngineKey;
};

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

  const opcodeKey = token.content?.trim();
  const opcodeDescription = (() => {
    if (!opcodeKey) return undefined;
    if (engineKey === "v8") return getV8OpcodeInfo(opcodeKey);
    if (engineKey === "jsc") return getJscTokenInfo(opcodeKey, { nextToken: nextToken?.content ?? null });
    return undefined;
  })();

  const content = (
    <Text as="span" fontSize={14} style={style}>
      {token.content}
    </Text>
  );

  if (!opcodeDescription) {
    return content;
  }

  return (
    <Popover.Root lazyMount unmountOnExit>
      <Popover.Trigger asChild>
        <Button as="span" size="2xs" fontSize={14} variant="ghost">
          {content}
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Arrow />
            <Popover.Body>
              <Popover.Title fontWeight="medium">{content}</Popover.Title>
              <Text as="span">{opcodeDescription}</Text>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
};

export default TokenSpan;
