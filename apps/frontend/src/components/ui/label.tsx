import type { ReactNode } from "react";
import { Text } from "@chakra-ui/react";

export function Label({ children }: { children: ReactNode }) {
  return (
    <Text as="span" textStyle="label" color="ink.label">
      {children}
    </Text>
  );
}
