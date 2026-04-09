import { Text } from "@chakra-ui/react";
import type { CSSProperties } from "react";
import type { ThemedToken } from "shiki";
import { getTokenInfo as getJscTokenInfo } from "../jsc-opcodes";
import { getTokenInfo as getHermesTokenInfo } from "../hermes-opcodes";
import { getTokenInfo as getSmTokenInfo } from "../spidermonkey-opcodes";
import { getOpcodeInfo as getV8OpcodeInfo } from "../v8-opcodes";
import type { EngineKey } from "@/lib/types";
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
