import { Text } from "@chakra-ui/react";
import type { CSSProperties } from "react";
import type { ThemedToken } from "shiki";

import type { EngineKey } from "@/lib/types";

import { describeEngineToken } from "../op-codes";
import ClickPopoverToken from "./ClickPopoverToken";

type Props = {
  token: ThemedToken;
  nextToken?: ThemedToken;
  engineKey: EngineKey;
};

const ITALIC = 1;
const BOLD = 2;
const UNDERLINE = 4;

const TokenSpan: React.FC<Props> = ({ token, nextToken, engineKey }) => {
  const fontStyle = token.fontStyle ?? 0;
  const style: CSSProperties = {
    color: token.color ?? "inherit",
    whiteSpace: "pre",
    ...(fontStyle & ITALIC ? { fontStyle: "italic" } : null),
    ...(fontStyle & BOLD ? { fontWeight: "bold" } : null),
    ...(fontStyle & UNDERLINE ? { textDecoration: "underline" } : null),
  };

  const description = describeEngineToken(engineKey, token.content, nextToken?.content ?? null);

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
