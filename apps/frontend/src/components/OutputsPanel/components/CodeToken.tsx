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

const FONT_STYLES: Array<[bit: number, style: CSSProperties]> = [
  [1, { fontStyle: "italic" }],
  [2, { fontWeight: "bold" }],
  [4, { textDecoration: "underline" }],
];

const TokenSpan: React.FC<Props> = ({ token, nextToken, engineKey }) => {
  const style: CSSProperties = {
    color: token.color ?? "inherit",
    whiteSpace: "pre",
    ...FONT_STYLES.reduce(
      (acc, [bit, css]) => (token.fontStyle && token.fontStyle & bit ? { ...acc, ...css } : acc),
      {} as CSSProperties,
    ),
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
