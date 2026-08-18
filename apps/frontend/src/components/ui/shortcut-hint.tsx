import { Span } from "@chakra-ui/react";

export function ShortcutHint({ children }: { children: React.ReactNode }) {
  return (
    <Span aria-hidden="true" fontSize="10px" letterSpacing="0.04em" opacity={0.6}>
      {children}
    </Span>
  );
}
