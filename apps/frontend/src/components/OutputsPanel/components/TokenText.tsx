import { Text } from "@chakra-ui/react";
import type { ThemedToken } from "shiki";

const ITALIC = 1;
const BOLD = 2;
const UNDERLINE = 4;

type Props = { token: ThemedToken };

const TokenText: React.FC<Props> = ({ token }) => {
  const fontStyle = token.fontStyle ?? 0;
  return (
    <Text
      as="span"
      fontSize={14}
      whiteSpace="pre"
      color={token.color ?? "inherit"}
      fontStyle={fontStyle & ITALIC ? "italic" : undefined}
      fontWeight={fontStyle & BOLD ? "bold" : undefined}
      textDecoration={fontStyle & UNDERLINE ? "underline" : undefined}
    >
      {token.content}
    </Text>
  );
};

export default TokenText;
