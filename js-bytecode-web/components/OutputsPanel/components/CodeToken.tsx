import { Tooltip } from "@/components/ui/tooltip";
import { Button, Popover, Portal, Text } from "@chakra-ui/react";
import type { CSSProperties } from "react";
import type { ThemedToken } from "shiki";
import { getBytecodeInfo } from "../v8-opcodes";

type Props = {
  token: ThemedToken;
};

const TokenSpan: React.FC<Props> = ({ token }) => {
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
  const opcodeDescription = opcodeKey ? getBytecodeInfo(opcodeKey) : undefined;

  const content = <span style={style}>{token.content}</span>;

  if (!opcodeDescription) {
    return content;
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button size="2xs" fontSize={13.6} variant="ghost">
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

  return (
    <Tooltip content={opcodeDescription} showArrow>
      <Text as="span" cursor="pointer">
        {content}
      </Text>
    </Tooltip>
  );
};

export default TokenSpan;
