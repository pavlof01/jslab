import { TokensResult } from "shiki";
import PlainCodeRow from "./CodeRow";

const CodeDisplay: React.FC<TokensResult> = ({ tokens, fg, bg }) => {
  return (
    <code
      style={{
        margin: 0,
        paddingTop: 16,
        paddingBottom: 16,
        overflowX: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize: "0.85rem",
        lineHeight: 1.6,
        color: fg ?? "inherit",
        background: bg ?? "transparent",
      }}
    >
      {tokens.map((row, idx) => (
        <PlainCodeRow key={`line-${idx}`} tokens={row} lineNumber={idx} />
      ))}
    </code>
  );
};

export default CodeDisplay;
