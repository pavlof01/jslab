import { ThemedToken } from "shiki";
import TokenSpan from "./CodeToken";
import { DiffKind } from "@/lib/types";

function LineNumber({ value, color }: { value: number | string; color?: string }) {
  return (
    <span
      style={{
        textAlign: "right",
        paddingInlineEnd: 8,
        opacity: 0.6,
        color,
        userSelect: "none",
      }}
    >
      {value}
    </span>
  );
}

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

  return (
    <span
      style={{ whiteSpace: "pre", display: "inline-block", minHeight: "1.65em", backgroundColor: meta?.background }}
    >
      <LineNumber value={tok.prevLine ?? ""} color={diffKind === DiffKind.Del ? meta?.accent : undefined} />
      <LineNumber value={tok.nextLine ?? ""} color={diffKind === DiffKind.Add ? meta?.accent : undefined} />
      {tokens.map((token, index) => (
        <TokenSpan key={index} token={token} />
      ))}
    </span>
  );
};

export default PlainCodeRow;
