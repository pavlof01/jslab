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

const FONT_STYLES: [bit: number, style: CSSProperties][] = [
  [1, { fontStyle: "italic" }],
  [2, { fontWeight: "bold" }],
  [4, { textDecoration: "underline" }],
];

const TokenSpan: React.FC<Props> = ({ token, nextToken, engineKey }) => {
  const style: CSSProperties = {
    color: token.color ?? "inherit",
    whiteSpace: "pre",
    // Merged, not accumulated: a reduce that spreads its accumulator builds a
    // fresh object per bit.
    ...Object.assign(
      {} as CSSProperties,
      ...FONT_STYLES.filter(([bit]) => token.fontStyle && token.fontStyle & bit).map(
        ([, css]) => css,
      ),
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
