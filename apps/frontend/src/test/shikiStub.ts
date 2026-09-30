type Token = { content: string; color?: string; offset: number };

export const createHighlighter = async () => ({
  codeToTokens: async (code: string) => {
    let offset = 0;
    return {
      tokens: code.split("\n").map((line): Token[] => {
        const lineOffset = offset;
        offset += line.length + 1;
        return [{ content: line, color: "#C9CEC9", offset: lineOffset }];
      }),
      fg: "#C9CEC9",
      bg: "#0C0D0E",
      themeName: "ayu-dark",
    };
  },
  loadLanguage: async () => {},
  getTheme: () => ({ bg: "#0C0D0E", fg: "#C9CEC9" }),
  getLoadedLanguages: () => ["v8bc", "jscbc", "smbc", "hermesbc", "javascript"],
});
