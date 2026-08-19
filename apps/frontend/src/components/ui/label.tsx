import { Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

export function Label({ children }: { children: ReactNode }) {
  return (
    <Text as="span" textStyle="label" color="ink.label">
      {children}
    </Text>
  );
}
