import { Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

type Props = { children: ReactNode };

const Label: React.FC<Props> = ({ children }) => {
  return (
    <Text as="span" textStyle="label" color="ink.label">
      {children}
    </Text>
  );
};

export default Label;
