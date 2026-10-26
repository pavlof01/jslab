import { Button } from "@chakra-ui/react";
import type { ThemedToken } from "shiki";

import { ClickPopover } from "@/components/ui";
import type { EngineKey } from "@/lib/types";

import { describeEngineToken } from "../op-codes";
import TokenText from "./TokenText";

type Props = {
  token: ThemedToken;
  nextToken?: ThemedToken;
  /** Whose opcodes to explain; none for output that is not engine bytecode. */
  engineKey?: EngineKey;
  slice?: ThemedToken;
};

const TokenSpan: React.FC<Props> = ({ token, nextToken, engineKey, slice }) => {
  const description =
    engineKey && describeEngineToken(engineKey, token.content, nextToken?.content ?? null);
  const content = <TokenText token={slice ?? token} />;
  if (!description) return content;

  return (
    <ClickPopover title={<TokenText token={token} />} content={description}>
      <Button variant="term" typeface="prose" type="button">
        {content}
      </Button>
    </ClickPopover>
  );
};

export default TokenSpan;
