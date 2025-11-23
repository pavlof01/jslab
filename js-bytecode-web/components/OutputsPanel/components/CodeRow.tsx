import { ThemedToken } from "shiki";
import TokenSpan from "./CodeToken";
import { DiffKind } from "@/lib/types";
import LineNumber from "./LineNumber";

type Props = {
  tokens: ThemedToken[];
};

const linePresentation: Record<DiffKind, { prefix: string; background: string; accent: string }> = {
  [DiffKind.Keep]: { prefix: " ", background: "transparent", accent: "inherit" },
  [DiffKind.Add]: { prefix: "+", background: "rgba(72, 187, 120, 0.12)", accent: "#68d391" },
  [DiffKind.Del]: { prefix: "-", background: "rgba(245, 101, 101, 0.12)", accent: "#fc8181" },
};

const PlainCodeRow: React.FC<Props> = ({ tokens }) => {
  if (!tokens.length) return null;

  const tok = tokens[0];
  const diffKind = tokens[0].diffType;
  const meta = diffKind ? linePresentation[diffKind] : undefined;
  const prefix = meta?.prefix ?? " ";

  return (
    <span
      style={{
        whiteSpace: "pre",
        display: "inline-block",
        minHeight: "1.65em",
        backgroundColor: meta?.background,
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: "1.5ch",
          textAlign: "center",
          color: meta?.accent,
          userSelect: "none",
        }}
      >
        {prefix}
      </span>
      <LineNumber value={tok.prevLine ?? ""} color={meta?.accent} />
      <LineNumber value={tok.nextLine ?? ""} color={meta?.accent} />
      {tokens.map((token, index) => (
        <TokenSpan key={index} token={token} />
      ))}
    </span>
  );
};

export default PlainCodeRow;
