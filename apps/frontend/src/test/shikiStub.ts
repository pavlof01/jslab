type Token = { content: string; color?: string; offset: number };

export const createHighlighter = async () => ({
  codeToTokens: async (code: string) => ({
    tokens: code
      .split("\n")
      .map((line): Token[] => [{ content: line, color: "#C9CEC9", offset: 0 }]),
    fg: "#C9CEC9",
    bg: "#0C0D0E",
    themeName: "ayu-dark",
  }),
  loadLanguage: async () => {},
  getTheme: () => ({ bg: "#0C0D0E", fg: "#C9CEC9" }),
  getLoadedLanguages: () => ["v8bc", "jscbc", "smbc", "hermesbc", "javascript"],
});
