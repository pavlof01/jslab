import {
  createSystem,
  defaultConfig,
  defineConfig,
  defineKeyframes,
  defineSemanticTokens,
  defineTokens,
} from "@chakra-ui/react";
import { layerStyles } from "./layerStyles";
import {
  bandRecipe,
  buttonRecipe,
  chipRecipe,
  inputRecipe,
  linkRecipe,
  textareaRecipe,
} from "./recipes";
import {
  dialogSlotRecipe,
  drawerSlotRecipe,
  menuSlotRecipe,
  popoverSlotRecipe,
  selectSlotRecipe,
  tabsSlotRecipe,
} from "./slotRecipes";
import { textStyles } from "./textStyles";

const tokens = defineTokens({
  colors: {
    surface: {
      base: { value: "#0C0D0E" },
      band: { value: "#0F1113" },
      overlay: { value: "#101214" },
      panel: { value: "#121416" },
      hover: { value: "#17191C" },
      bandHover: { value: "#15171A" },
      accentSoft: { value: "#15170F" },
      accentRow: { value: "#1A1C13" },
    },

    rule: {
      hairline: { value: "#1B1E21" },
      divider: { value: "#1C1F22" },
      row: { value: "#1E2124" },
      list: { value: "#1F2225" },
      structural: { value: "#24272A" },
      panel: { value: "#2A2D30" },
      control: { value: "#33373B" },
      link: { value: "#3A3E42" },
      accentDim: { value: "#3B3617" },
      accent: { value: "#6B6320" },
    },

    ink: {
      1: { value: "#E8E9E7" },
      code: { value: "#C9CEC9" },
      2: { value: "#9BA09D" },
      3: { value: "#8E938F" },
      4: { value: "#7E8380" },
      label: { value: "#6B6F6D" },
      5: { value: "#5B5F62" },
      6: { value: "#4F5457" },
      gutter: { value: "#3E4245" },
    },

    accent: {
      DEFAULT: { value: "#F9E31A" },
      ink: { value: "#0C0D0E" },
      hover: { value: "#FFFFFF" },
      muted: { value: "#8A7F26" },
    },

    status: {
      ok: { value: "#8FBF7F" },
      error: { value: "#D97B5A" },
      warn: { value: "#D9C86C" },
      info: { value: "#7FB3D5" },

      errorSoft: { value: "#17100D" },
      errorRule: { value: "#3C241A" },
    },

    syn: {
      plain: { value: "#C9CEC9" },
      intrinsic: { value: "#F9E31A" },
      string: { value: "#9FD39A" },
      keyword: { value: "#7FB3D5" },
      number: { value: "#D9A66C" },
      comment: { value: "#61665F" },
    },
  },

  fonts: {
    mono: { value: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace" },
    sans: { value: "'Helvetica Neue', Helvetica, 'Segoe UI', Arial, sans-serif" },
    body: { value: "'Helvetica Neue', Helvetica, 'Segoe UI', Arial, sans-serif" },
    heading: { value: "'Helvetica Neue', Helvetica, 'Segoe UI', Arial, sans-serif" },
  },

  durations: {
    hover: { value: "140ms" },
    reveal: { value: "240ms" },
    result: { value: "320ms" },
  },

  easings: {
    DEFAULT: { value: "ease" },
  },

  shadows: {
    menu: { value: "0 18px 40px rgba(0, 0, 0, 0.55)" },
  },

  letterSpacings: {
    control: { value: "0.12em" },
    label: { value: "0.14em" },
    labelWide: { value: "0.16em" },
    display: { value: "-0.04em" },
    heading: { value: "-0.028em" },
  },

  opacity: {
    pending: { value: "0.3" },
    disabled: { value: "0.42" },
  },

  spacing: {
    appX: { value: "clamp(12px, 1.4vw, 18px)" },
  },

  sizes: {
    header: { value: "46px" },
  },

  radii: {
    none: { value: "0px" },
  },
});

const semanticTokens = defineSemanticTokens({
  colors: {
    brand: {
      solid: { value: "{colors.accent}" },
      contrast: { value: "{colors.accent.ink}" },
      fg: { value: "{colors.accent}" },
      muted: { value: "{colors.rule.accentDim}" },
      subtle: { value: "{colors.surface.accentSoft}" },
      emphasized: { value: "{colors.accent.hover}" },
      focusRing: { value: "{colors.accent}" },
    },
  },
});

const keyframes = defineKeyframes({
  reveal: { to: { opacity: 1 } },
  cursor: { "from, to": { opacity: 1 } },
});

const config = defineConfig({
  theme: {
    keyframes,
    tokens,
    semanticTokens,
    textStyles,
    layerStyles,
    recipes: {
      button: buttonRecipe,
      band: bandRecipe,
      input: inputRecipe,
      textarea: textareaRecipe,
      link: linkRecipe,
      chip: chipRecipe,
    },
    slotRecipes: {
      menu: menuSlotRecipe,
      select: selectSlotRecipe,
      dialog: dialogSlotRecipe,
      drawer: drawerSlotRecipe,
      popover: popoverSlotRecipe,
      tabs: tabsSlotRecipe,
    },
  },
});

export const system = createSystem(defaultConfig, config);
