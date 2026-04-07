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
      100: { value: "#CDBB16" },
      200: { value: "#E2CE18" },
      300: { value: "#F9E31A" },
      400: { value: "#8E8215" },
      500: { value: "#595212" },
      600: { value: "#3E3A11" },
      700: { value: "#312E10" },
      800: { value: "#23210F" },
      900: { value: "#373525" },
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
    <ColorModeProvider forcedTheme="dark" enableSystem={false}>
      <ChakraProvider value={system}>
        {children}
      </ChakraProvider>
    </ColorModeProvider>
  );
}
