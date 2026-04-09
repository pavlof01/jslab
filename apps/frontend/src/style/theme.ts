import { createSystem, defaultConfig, defineSemanticTokens, defineTokens } from "@chakra-ui/react";
import { buttonRecipe } from "./recipes";

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

export const system = createSystem(defaultConfig, {
  theme: {
    tokens,
    semanticTokens,
    recipes: {
      button: buttonRecipe,
    },
  },
});
