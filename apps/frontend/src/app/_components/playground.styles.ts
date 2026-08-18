import type { SystemStyleObject } from "@chakra-ui/react";


export const frame: SystemStyleObject = {
  height: "calc(100dvh - {sizes.header})",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  bg: "surface.base",
};

export const toolbar: SystemStyleObject = {
  flex: "0 0 auto",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "8px clamp(10px, 1.4vw, 20px)",
  py: "8px",
  px: "appX",
  borderBottomWidth: "1px",
  borderBottomColor: "rule.structural",
  bg: "surface.band",
};

export const toolbarEngines: SystemStyleObject = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "5px 6px",
  flex: "1 1 220px",
  minWidth: 0,
};

export const toolbarActions: SystemStyleObject = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "6px 8px",
  flex: "0 1 auto",
  minWidth: 0,
};

const band: SystemStyleObject = {
  flex: "0 0 auto",
  py: "7px",
  px: "appX",
  bg: "surface.band",
  fontFamily: "mono",
};

export const messageLine = (kind: "error" | "notice"): SystemStyleObject => ({
  ...band,
  borderBottomWidth: "1px",
  borderBottomColor: "rule.structural",
  fontSize: "11.5px",
  color: kind === "error" ? "status.error" : "status.warn",
});

export const footerLine: SystemStyleObject = {
  ...band,
  borderTopWidth: "1px",
  borderTopColor: "rule.structural",
  fontSize: "11px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "ink.label",
};

export const splitRow: SystemStyleObject = { flex: "1 1 0", minHeight: 0 };

export const editorPane: SystemStyleObject = {
  bg: "surface.band",
  display: "flex",
  flexDirection: "column",
};

export const editorHost: SystemStyleObject = {
  flex: "1 1 auto",
  minHeight: 0,
  height: "100%",
  position: "relative",
  display: "flex",
  flexDirection: "column",
};

export const outputPane: SystemStyleObject = {
  display: "flex",
  flexDirection: "column",
  bg: "surface.base",
};

export const outputScroller: SystemStyleObject = { flex: "1 1 auto", minHeight: 0, overflow: "auto" };

export const engineNote: SystemStyleObject = {
  flex: "0 0 auto",
  py: "7px",
  px: "clamp(10px, 1vw, 14px)",
  borderBottomWidth: "1px",
  borderBottomColor: "rule.row",
  bg: "surface.accentSoft",
  borderLeftWidth: "2px",
  borderLeftColor: "rule.accentDim",
  fontFamily: "mono",
  fontSize: "11.5px",
  lineHeight: 1.5,
  color: "ink.4",
  textWrap: "pretty",
};

export const outputFooter: SystemStyleObject = {
  flex: "0 0 auto",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "4px 14px",
  py: "8px",
  px: "clamp(10px, 1vw, 14px)",
  borderTopWidth: "1px",
  borderTopColor: "rule.structural",
  bg: "surface.band",
  fontFamily: "mono",
  fontSize: "11px",
  color: "ink.label",
};
