import tsPlugin from "@typescript-eslint/eslint-plugin";
import next from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const config = [
  {
    // scripts/ holds standalone Node build/dump scripts, not the Next app —
    // their `useX` helpers trip the React hooks rules. full-bytecode.js is a
    // bytecode specimen: `arguments`, `==` and unreachable code are the point of
    // it, so it is formatted but not linted. .next is generated.
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "scripts/**",
      "coverage/**",
      "public/**",
    ],
  },
  ...next,
  {
    plugins: { "simple-import-sort": simpleImportSort, "@typescript-eslint": tsPlugin },
    rules: {
      // Imports are grouped, not just sorted: node builtins, then packages, then
      // the "@/" alias, then relative paths, with a blank line between groups.
      "simple-import-sort/imports": [
        "error",
        {
          groups: [["^node:", "^\\u0000"], ["^@?\\w"], ["^@/"], ["^\\."]],
        },
      ],
      "simple-import-sort/exports": "error",

      // A component is an arrow assigned to a const, default-exported — see
      // "Frontend components" in CONTRIBUTING.md.
      "react/function-component-definition": [
        "error",
        { namedComponents: "arrow-function", unnamedComponents: "arrow-function" },
      ],
      // Raw HTML into the DOM is a decision, not a detail: every use is
      // suppressed at the site with a reason.
      "react/no-danger": "error",
      "react/no-array-index-key": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/refs": "error",
      "no-unused-disable": "off",
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
  {
    // Props are a `type`, not an `interface` — scoped to .tsx because the
    // `declare global` / `declare module` augmentations in .d.ts depend on
    // declaration merging, which only `interface` has.
    files: ["**/*.tsx"],
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    },
  },
  // Must stay last: switches off every rule that would fight Prettier.
  prettier,
];

export default config;
