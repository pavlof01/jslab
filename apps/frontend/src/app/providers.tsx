"use client";

import {
  ChakraProvider,
  createSystem,
  defaultConfig,
  defineTokens,
  defineSemanticTokens,
  defineRecipe,
} from "@chakra-ui/react";
import { ColorModeProvider } from "@/components/ui/color-mode";
import type { ReactNode } from "react";

const tokens = defineTokens({
  colors: {
    yellow: {
      300: { value: "#f9e31a" },
    },
    brand: {
      300: { value: "#f9e31a" },
      500: { value: "#f9e31a" },
    },
  },
});
const semanticTokens = defineSemanticTokens({
  colors: {
    brand: {
      solid: { value: "{colors.brand.500}" },
      contrast: { value: "{colors.brand.100}" },
      fg: { value: "{colors.brand.700}" },
      muted: { value: "{colors.brand.100}" },
      subtle: { value: "{colors.brand.200}" },
      emphasized: { value: "{colors.brand.300}" },
      focusRing: { value: "{colors.brand.500}" },
    },
  },
});

const buttonRecipe = defineRecipe({
  variants: {
    variant: {
      solid: {
        bg: "brand.300",
        color: "black",
        _hover: {
          bg: "brand.300/70",
        },
        _active: {
          bg: "brand.contrast",
        },
      },
    },
  },
});

const system = createSystem(defaultConfig, {
  preflight: false,
  theme: {
    tokens,
    semanticTokens,
    recipes: {
      button: buttonRecipe,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider forcedTheme="dark" enableSystem={false}>
        {children}
      </ColorModeProvider>
    </ChakraProvider>
  );
}
