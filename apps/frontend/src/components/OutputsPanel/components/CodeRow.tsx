import { ThemedToken } from "shiki";
import TokenSpan from "./CodeToken";
import { DiffKind } from "@/lib/types";
import LineNumber from "./LineNumber";
import type { EngineKey } from "@/lib/types";

type Props = {
  tokens: ThemedToken[];
  lineNumber: number;
  engineKey: EngineKey;
};

const diffKindToClass: Record<DiffKind, string> = {
  [DiffKind.Add]: "diff-add",
  [DiffKind.Del]: "diff-del",
  [DiffKind.Keep]: "diff-keep",
};

const diffKindToPrefix: Record<DiffKind, string> = {
  [DiffKind.Add]: "+",
  [DiffKind.Del]: "-",
  [DiffKind.Keep]: " ",
};

const PlainCodeRow: React.FC<Props> = ({ tokens, lineNumber, engineKey }) => {
  if (!tokens.length) return null;

  const tok = tokens[0];
  const diffKind = tokens[0].diffType;
  const diffClass = diffKind ? diffKindToClass[diffKind] : "";
  const prefix = diffKind ? diffKindToPrefix[diffKind] : " ";

  return (
    <span
      className={diffClass}
      style={{
        whiteSpace: "pre",
        display: "inline-block",
        minHeight: "1.65em",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: "1.5ch",
          textAlign: "center",
          userSelect: "none",
        }}
      >
        {prefix}
      </span>
      <LineNumber value={tok.prevLine ?? lineNumber} />
      <LineNumber value={tok.nextLine ?? ""} />
      {tokens.map((token, index) => (
        <TokenSpan key={token.offset} token={token} nextToken={tokens[index + 1]} engineKey={engineKey} />
      ))}
    </span>
  );
};

export default PlainCodeRow;
