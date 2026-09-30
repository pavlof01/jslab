import { Text } from "@chakra-ui/react";
import type { CSSProperties } from "react";
import type { ThemedToken } from "shiki";

type Props = { token: ThemedToken };

const TokenText: React.FC<Props> = ({ token }) => {
  const fontStyle = token.fontStyle ?? 0;
  const style: CSSProperties = {
    color: token.color ?? "inherit",
    whiteSpace: "pre",
    ...(fontStyle & 1 ? { fontStyle: "italic" } : null),
    ...(fontStyle & 2 ? { fontWeight: "bold" } : null),
    ...(fontStyle & 4 ? { textDecoration: "underline" } : null),
  };
  return (
    <Text as="span" fontSize={14} style={style}>
      {token.content}
    </Text>
  );
};

export default TokenText;
