import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

// One ESLint for the whole tree except apps/frontend, which needs
// eslint-config-next and therefore keeps its own config next to its own install.
// Type-aware rules are deliberately not enabled: they would need a TS program per
// workspace (nine tsconfigs, nine lockfiles) and turn a two-second check into a
// minute.
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "apps/frontend/**",
      "apps/trace-service/engine262/**",
      "**/*.min.js",
      // Bytecode specimens, not application code: they exist to make an engine
      // emit every opcode, so `arguments`, `==`, unreachable statements and
      // functions named `useX` are the point of them. Prettier still formats
      // them; linting them would be nonsense.
      "scripts/switch.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "simple-import-sort": simpleImportSort },
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // Imports are grouped, not just sorted: node builtins, then packages, then
      // relative paths, with a blank line between groups. Bare imports keep their
      // place so a side effect cannot be reordered past the code that needs it.
      "simple-import-sort/imports": [
        "error",
        {
          groups: [["^node:", "^\\u0000"], ["^@?\\w"], ["^\\."]],
        },
      ],
      "simple-import-sort/exports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // `any` at a framework boundary is sometimes the honest type; it is meant
      // to be visible, not fatal.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.mts", "**/*.spec.ts", "**/test/**", "**/__tests__/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  // Must stay last: switches off every rule that would fight the formatter.
  prettier,
);
