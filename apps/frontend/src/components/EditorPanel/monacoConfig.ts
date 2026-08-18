import type * as Monaco from "monaco-editor";

export const JSL_THEME: Monaco.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "", foreground: "C9CEC9" },
    { token: "keyword", foreground: "7FB3D5" },
    { token: "string", foreground: "9FD39A" },
    { token: "number", foreground: "D9A66C" },
    { token: "comment", foreground: "61665F" },
    { token: "delimiter", foreground: "8E938F" },
    { token: "type", foreground: "7FB3D5" },
  ],
  colors: {
    "editor.background": "#0F1113",
    "editor.foreground": "#C9CEC9",
    "editorLineNumber.foreground": "#3E4245",
    "editorLineNumber.activeForeground": "#8E938F",
    "editorCursor.foreground": "#F9E31A",
    "editor.selectionBackground": "#24272A",
    "editor.lineHighlightBackground": "#111417",
    "editorIndentGuide.background1": "#1B1E21",
    "editorWidget.background": "#111315",
    "editorWidget.border": "#24272A",
    "editorSuggestWidget.selectedBackground": "#1A1D20",
  },
};

export const EDITOR_OPTIONS: Monaco.editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  fontSize: 12.5,
  lineHeight: 21,
  fontFamily: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace",
  overviewRulerLanes: 0,
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,
  folding: false,
  lineDecorationsWidth: 10,
  lineNumbersMinChars: 3,
  renderLineHighlight: "none",
  scrollBeyondLastLine: false,
  scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
  padding: { top: 10, bottom: 22 },
};
