import { defineRecipe } from "@chakra-ui/react";

export const controlTransition = {
  transitionProperty: "background, border-color, color",
  transitionDuration: "hover",
  transitionTimingFunction: "DEFAULT",
} as const;

export const controlLabel = {
  fontFamily: "mono",
  letterSpacing: "control",
  textTransform: "uppercase",
  borderRadius: "none",
  ...controlTransition,
} as const;

export const overlayPanel = {
  layerStyle: "overlay",
  fontFamily: "mono",
  color: "ink.code",
} as const;

const accentButton = {
  bg: "accent",
  borderWidth: "1px",
  borderColor: "accent",
  color: "accent.ink",
  fontWeight: "600",
  _hover: { bg: "accent.hover", borderColor: "accent.hover" },
} as const;

const buttonSize = (fontSize: string, px: string, py: string) => ({
  textStyle: "none",
  fontSize,
  px,
  py,
  minH: "unset",
  minW: "unset",
  h: "auto",
  lineHeight: "normal",
});

export const bandRecipe = defineRecipe({
  base: {
    display: "flex",
    flexWrap: "wrap",
    bg: "surface.band",
    px: "clamp(14px, 2vw, 20px)",
    py: "11px",
  },
  variants: {
    tone: {
      panel: { alignItems: "center", gap: "10px 20px", borderColor: "rule.structural" },
      pane: {
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: "8px 14px",
        borderColor: "rule.row",
      },
    },
    edge: {
      top: { borderBottomWidth: "1px" },
      bottom: { borderTopWidth: "1px" },
      none: {},
    },
  },
  defaultVariants: { tone: "panel", edge: "top" },
});

export const buttonRecipe = defineRecipe({
  base: {
    ...controlLabel,
    display: "inline-flex",
    alignItems: "center",
    gap: "9px",
    fontWeight: "400",
    cursor: "pointer",
    _disabled: { opacity: "disabled", cursor: "not-allowed" },
  },
  variants: {
    variant: {
      primary: accentButton,
      ghost: {
        bg: "transparent",
        borderWidth: "1px",
        borderColor: "rule.control",
        color: "ink.code",
        _hover: { borderColor: "accent", color: "accent" },
      },
      rule: {
        bg: "transparent",
        border: 0,
        borderBottomWidth: "1px",
        borderColor: "rule.link",
        px: "0",
        py: "0",
        display: "inline",
        verticalAlign: "baseline",
        color: "inherit",
      },
      quiet: {
        bg: "transparent",
        border: "0",
        px: "0",
        py: "0",
        color: "ink.5",
        letterSpacing: "0.1em",
        _hover: { color: "accent" },
      },
    },
    active: {
      true: { bg: "surface.accentSoft", borderColor: "accent", color: "accent" },
    },
    size: {
      xs: buttonSize("10.5px", "8px", "3px"),
      sm: buttonSize("11px", "10px", "5px"),
      md: buttonSize("11.5px", "11px", "7px"),
      lg: buttonSize("12.5px", "20px", "11px"),
    },
    typeface: {
      label: {},
      code: {
        textTransform: "none",
        letterSpacing: "normal",
        textAlign: "left",
        fontSize: "12.5px",
      },
      prose: {
        fontFamily: "inherit",
        fontSize: "inherit",
        letterSpacing: "inherit",
        lineHeight: "inherit",
        textTransform: "none",
        whiteSpace: "inherit",
        userSelect: "text",
      },
    },
  },
  defaultVariants: { variant: "ghost", size: "sm", typeface: "label" },
});

export const chipRecipe = defineRecipe({
  base: {
    appearance: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    px: "9px",
    py: "6px",
    borderRadius: "none",
    fontFamily: "mono",
    fontSize: "11px",
    bg: "transparent",
    borderWidth: "1px",
    borderColor: "rule.structural",
    color: "ink.3",
    cursor: "pointer",
    ...controlTransition,
    "& [data-part=mark]": {
      flex: "0 0 auto",
      borderWidth: "1px",
      borderColor: "ink.6",
      bg: "transparent",
      ...controlTransition,
    },
    _disabled: { opacity: "disabled", cursor: "not-allowed" },
  },
  variants: {
    checked: {
      true: {
        bg: "surface.accentSoft",
        borderColor: "rule.accent",
        color: "accent",
        "& [data-part=mark]": { borderColor: "accent", bg: "accent" },
      },
      false: { _hover: { borderColor: "accent", color: "accent" } },
    },
    shape: {
      box: { "& [data-part=mark]": { w: "8px", h: "8px", borderRadius: "none" } },
      radio: { "& [data-part=mark]": { w: "6px", h: "6px", borderRadius: "full" } },
    },
  },
  defaultVariants: { checked: false, shape: "box" },
});

export const linkRecipe = defineRecipe({
  base: {
    color: "ink.1",
    borderBottomWidth: "1px",
    borderBottomColor: "rule.link",
    pb: "1px",
    textDecoration: "none",
    textTransform: "none",
    letterSpacing: "normal",
    ...controlTransition,
    _hover: { color: "accent", borderBottomColor: "accent", textDecoration: "none" },
  },
  variants: {
    typeface: {
      mono: { fontFamily: "mono", fontSize: "11.5px" },
      sans: { fontSize: "12.5px" },
    },
  },
  defaultVariants: { typeface: "sans" },
});

export const fieldBase = {
  borderRadius: "none",
  border: "1px solid",
  borderColor: "rule.control",
  bg: "surface.base",
  color: "ink.1",
  caretColor: "accent",
  fontFamily: "mono",
  fontSize: "12.5px",
  _placeholder: { color: "ink.6" },
  _focusVisible: { borderColor: "accent", outline: "none", boxShadow: "none" },
} as const;

export const inputRecipe = defineRecipe({
  base: fieldBase,
  variants: {
    variant: {
      seamless: { border: 0, bg: "transparent", px: 0, appearance: "none" },
    },
  },
});
export const textareaRecipe = defineRecipe({ base: fieldBase });
