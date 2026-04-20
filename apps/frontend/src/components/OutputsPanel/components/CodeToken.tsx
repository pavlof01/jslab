import { Text } from "@chakra-ui/react";
import type { CSSProperties } from "react";
import type { ThemedToken } from "shiki";
import { getTokenInfo as getJscTokenInfo } from "../op-codes/jsc-opcodes";
import { getTokenInfo as getHermesTokenInfo } from "../op-codes/hermes-opcodes";
import { getTokenInfo as getSmTokenInfo } from "../op-codes/spidermonkey-opcodes";
import { getOpcodeInfo as getV8OpcodeInfo } from "../op-codes/v8-opcodes";
import { EngineKey } from "@/lib/types";
import ClickPopoverToken from "./ClickPopoverToken";

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

  const tokenKey = token.content?.trim();
  const description = (() => {
    if (!tokenKey) return undefined;
    if (engineKey === EngineKey.v8) return getV8OpcodeInfo(tokenKey);
    if (engineKey === EngineKey.jsc) return getJscTokenInfo(tokenKey, { nextToken: nextToken?.content ?? null });
    if (engineKey === EngineKey.hermes) return getHermesTokenInfo(tokenKey, { nextToken: nextToken?.content ?? null });
    if (engineKey === EngineKey.sm) return getSmTokenInfo(tokenKey, { nextToken: nextToken?.content ?? null });
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
