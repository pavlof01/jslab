import { defineTextStyles } from "@chakra-ui/react";

export const textStyles = defineTextStyles({
  label: {
    description: "Micro-label naming a pane, a row or a control group",
    value: {
      fontFamily: "mono",
      fontSize: "11px",
      letterSpacing: "label",
      textTransform: "uppercase",
      fontWeight: "400",
      lineHeight: "normal",
    },
  },

  labelSm: {
    description: "Micro-label in dense framing",
    value: {
      fontFamily: "mono",
      fontSize: "10px",
      letterSpacing: "label",
      textTransform: "uppercase",
      fontWeight: "400",
      lineHeight: "normal",
    },
  },

  codeInline: {
    description: "A code fragment inside a line of prose",
    value: { fontFamily: "mono", fontSize: "0.92em", fontWeight: "400", letterSpacing: "-0.01em" },
  },

  code: {
    description: "Identifiers, engine output and spec text",
    value: { fontFamily: "mono", fontSize: "12.5px" },
  },

  codeSm: {
    description: "Secondary mono text",
    value: { fontFamily: "mono", fontSize: "11.5px" },
  },

  codeLg: {
    description: "Mono text that leads a section",
    value: { fontFamily: "mono", fontSize: "13.5px" },
  },

  codeXl: {
    description: "The expression a page is about",
    value: { fontFamily: "mono", fontSize: "14.5px" },
  },

  body: {
    description: "Prose",
    value: { fontSize: "15px", lineHeight: "1.55" },
  },

  bodySm: {
    description: "Secondary prose",
    value: { fontSize: "13px", lineHeight: "1.6" },
  },

  title: {
    description: "Section heading",
    value: { fontWeight: "600", letterSpacing: "-0.015em", lineHeight: "1.2" },
  },

  display: {
    description: "Page-opening heading",
    value: { fontWeight: "700", letterSpacing: "heading", lineHeight: "1.05" },
  },
});
