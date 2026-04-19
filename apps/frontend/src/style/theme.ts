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
    background: {
      100: { value: "#1e1e1e" },
      200: { value: "#161616" },
      300: { value: "#0a0a0a" },
    },
    surface: {
      100: { value: "rgba(255,255,255,0.03)" },
      200: { value: "rgba(255,255,255,0.05)" },
    },
    brandAlpha: {
      50: { value: "rgba(249,227,26,0.06)" },
      100: { value: "rgba(249,227,26,0.10)" },
      200: { value: "rgba(249,227,26,0.20)" },
    },
    overlay: {
      100: { value: "rgba(20,20,20,0.90)" },
    },
    navSurface: {
      50: { value: "rgba(35,33,15,0.08)" },
      100: { value: "rgba(35,33,15,0.82)" },
      200: { value: "rgba(35,33,15,0.98)" },
    },
    scrim: {
      100: { value: "rgba(0,0,0,0.25)" },
      200: { value: "rgba(0,0,0,0.60)" },
    },
    divider: {
      100: { value: "rgba(38,38,38,1)" },
    },
    glow: {
      blue: { value: "rgba(96,165,250,0.06)" },
      orange: { value: "rgba(255,159,64,0.05)" },
      brand: { value: "rgba(249,227,26,0.55)" },
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
