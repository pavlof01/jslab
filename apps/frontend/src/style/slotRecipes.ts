import { defineSlotRecipe } from "@chakra-ui/react";
import {
  dialogAnatomy,
  drawerAnatomy,
  menuAnatomy,
  popoverAnatomy,
  selectAnatomy,
  tabsAnatomy,
} from "@chakra-ui/react/anatomy";

import { controlLabel, controlTransition, fieldBase, overlayPanel } from "./recipes";

export const menuSlotRecipe = defineSlotRecipe({
  slots: menuAnatomy.keys(),
  base: {
    content: { ...overlayPanel, fontSize: "12px", minW: "180px", p: "0" },
    item: {
      borderRadius: "none",
      px: "12px",
      py: "8px",
      fontSize: "12px",
      color: "ink.code",
      _hover: { bg: "surface.hover" },
      _highlighted: { bg: "surface.hover" },
      _disabled: { color: "ink.6" },
    },
    itemGroupLabel: {
      px: "12px",
      py: "8px",
      fontSize: "10px",
      letterSpacing: "labelWide",
      textTransform: "uppercase",
      color: "ink.6",
    },
    separator: { borderColor: "rule.divider" },
  },
});

export const selectSlotRecipe = defineSlotRecipe({
  slots: selectAnatomy.keys(),
  base: {
    trigger: {
      ...controlLabel,
      border: "1px solid",
      borderColor: "rule.control",
      bg: "transparent",
      color: "ink.code",
      fontSize: "11px",
      minH: "27px",
      ps: "10px",
      pe: "30px",
      gap: "8px",
      cursor: "pointer",
      _hover: { borderColor: "accent", color: "accent" },
      _open: { borderColor: "accent", bg: "surface.accentSoft", color: "accent" },
    },
    valueText: { fontFamily: "mono" },
    indicatorGroup: { color: "ink.5" },
    clearTrigger: { color: "ink.5", _hover: { color: "accent" } },
    content: { ...overlayPanel, p: "0", minW: "260px" },
    item: {
      borderRadius: "none",
      px: "12px",
      py: "7px",
      fontSize: "12.5px",
      color: "ink.code",
      _hover: { bg: "surface.hover" },
      _highlighted: { bg: "surface.hover" },
      _checked: { color: "accent" },
    },
    itemGroupLabel: {
      textStyle: "labelSm",
      px: "12px",
      pt: "10px",
      pb: "5px",
      color: "ink.6",
      borderTop: "1px solid",
      borderColor: "rule.hairline",
    },
  },
  variants: {
    size: {
      sm: { trigger: { h: "27px", minH: "27px" } },
    },
  },
});

const framedSurface = {
  backdrop: {
    bg: "surface.base/72",
    backdropFilter: "blur(2px)",
  },
  content: {
    borderRadius: "none",
    border: "1px solid",
    borderColor: "rule.panel",
    bg: "surface.panel",
    boxShadow: "menu",
    color: "ink.2",
  },
  header: { borderBottom: "1px solid", borderColor: "rule.structural", bg: "surface.band" },
  title: {
    fontFamily: "mono",
    fontSize: "12px",
    letterSpacing: "labelWide",
    textTransform: "uppercase",
    fontWeight: "400",
    color: "ink.1",
  },
  footer: { borderTop: "1px solid", borderColor: "rule.structural", bg: "surface.band" },
} as const;

export const dialogSlotRecipe = defineSlotRecipe({
  slots: dialogAnatomy.keys(),
  base: framedSurface,
});
export const drawerSlotRecipe = defineSlotRecipe({
  slots: drawerAnatomy.keys(),
  base: framedSurface,
});

export const popoverSlotRecipe = defineSlotRecipe({
  slots: popoverAnatomy.keys(),
  base: {
    content: { ...overlayPanel, fontSize: "12px" },
    body: { fontFamily: "mono" },
  },
});

const tabList = {
  flexWrap: "wrap",
  alignItems: "stretch",
  borderBottomWidth: "1px",
  borderColor: "rule.hairline",
} as const;

const tabTrigger = {
  minW: "0",
  textAlign: "left",
  cursor: "pointer",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  gap: "2px 9px",
  fontFamily: "mono",
  fontSize: "12px",
  fontWeight: "400",
  borderRadius: "none",
  color: "ink.3",
  ...controlTransition,
  "&:hover:not([data-selected])": { color: "ink.1" },
} as const;

export const tabsSlotRecipe = defineSlotRecipe({
  slots: tabsAnatomy.keys(),
  variants: {
    variant: {
      panes: {
        list: { ...tabList, gap: "1px", bg: "rule.hairline" },
        trigger: {
          ...tabTrigger,
          bg: "surface.band",
          borderTopWidth: "2px",
          borderTopColor: "transparent",
          borderBottomWidth: "0",
          px: "14px",
          pt: "6px",
          pb: "7px",
          _selected: { bg: "surface.base", borderTopColor: "accent", color: "accent" },
        },
      },
      underline: {
        list: { ...tabList, gap: "8px 18px", bg: "transparent" },
        trigger: {
          ...tabTrigger,
          bg: "transparent",
          borderTopWidth: "0",
          borderBottomWidth: "1px",
          borderBottomColor: "transparent",
          px: "0",
          pt: "2px",
          pb: "3px",
          _selected: { borderBottomColor: "accent", color: "accent" },
        },
      },
    },
  },
});
