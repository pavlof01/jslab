import type { ThemedToken } from "shiki";

const ITALIC = 1;
const BOLD = 2;
const UNDERLINE = 4;

type Props = { token: ThemedToken };

// A plain span, as shiki itself emits: a listing runs to tens of thousands of
// tokens, and a styled component per token costs seconds to mount.
const TokenText: React.FC<Props> = ({ token }) => {
  const fontStyle = token.fontStyle ?? 0;
  return (
    <span
      style={{
        fontSize: 14,
        whiteSpace: "pre",
        color: token.color ?? "inherit",
        fontStyle: fontStyle & ITALIC ? "italic" : undefined,
        fontWeight: fontStyle & BOLD ? "bold" : undefined,
        textDecoration: fontStyle & UNDERLINE ? "underline" : undefined,
      }}
    >
      {token.content}
    </span>
  );
};

export default TokenText;
