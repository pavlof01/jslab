import { Text } from "@chakra-ui/react";
import type React from "react";

type Props = {
  value?: number | string;
  color?: string;
  width?: string;
};

const LineNumber: React.FC<Props> = ({ value, color, width = "4ch" }) => {
  if (value === undefined) return null;
  return (
    <Text
      as="span"
      userSelect="none"
      color={color}
      opacity={0.6}
      paddingInlineEnd={8}
      textAlign="right"
      display="inline-block"
      width={width}
      fontSize={12}
    >
      {value}
    </Text>
  );
};

export default LineNumber;
