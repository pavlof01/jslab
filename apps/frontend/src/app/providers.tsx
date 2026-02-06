"use client";

import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { ColorModeProvider } from "@/components/ui/color-mode";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider value={defaultSystem}>
      <ColorModeProvider forcedTheme="dark" enableSystem={false}>
        {children}
      </ColorModeProvider>
    </ChakraProvider>
  );
}
