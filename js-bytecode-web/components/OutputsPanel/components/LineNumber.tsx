import React from "react";

type Props = {
  value: number | string;
  color?: string;
  width?: string;
};

const LineNumber: React.FC<Props> = ({ value, color, width = "4ch" }) => {
  return (
    <span
      style={{
        display: "inline-block",
        width,
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
};

export default LineNumber;
