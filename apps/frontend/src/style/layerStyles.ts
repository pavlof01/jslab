import { defineLayerStyles } from "@chakra-ui/react";

export const layerStyles = defineLayerStyles({
  panel: {
    description: "A pane raised off the page ground",
    value: { bg: "surface.panel", borderWidth: "1px", borderColor: "rule.panel" },
  },

  section: {
    description: "A landing section, ruled off from the one above",
    value: { bg: "surface.base", borderTopWidth: "1px", borderColor: "rule.structural" },
  },

  overlay: {
    description: "A floating surface",
    value: {
      bg: "surface.overlay",
      borderWidth: "1px",
      borderColor: "rule.panel",
      borderRadius: "none",
      boxShadow: "menu",
    },
  },
});
