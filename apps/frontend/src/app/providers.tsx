"use client";

import { ChakraProvider } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { system } from "@/style/theme";
import { ThemeProvider } from "next-themes";

type Props = {
  children: ReactNode;
};

export const Providers: React.FC<Props> = ({ children }) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      disableTransitionOnChange
      forcedTheme="dark"
      enableSystem={false}
    >
      <ChakraProvider value={system}>{children}</ChakraProvider>
    </ThemeProvider>
  );
};
