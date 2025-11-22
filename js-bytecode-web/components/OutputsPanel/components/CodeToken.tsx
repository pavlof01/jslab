import { CSSProperties } from "react";
import { ThemedToken } from "shiki";

type Props = {
  token: ThemedToken;
};

const TokenSpan: React.FC<Props> = ({ token }) => {
  const style: CSSProperties = {
    color: token.color ?? "inherit",
    whiteSpace: "pre",
  };

  if (token.fontStyle) {
    if (token.fontStyle & 1) style.fontStyle = "italic";
    if (token.fontStyle & 2) style.fontWeight = "bold";
    if (token.fontStyle & 4) style.textDecoration = "underline";
  }

  return <span style={style}>{token.content}</span>;
};

export default TokenSpan;
