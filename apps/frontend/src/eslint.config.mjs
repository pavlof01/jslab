import next from "eslint-config-next/core-web-vitals";

const config = [
  {
    // scripts/ holds standalone Node build/dump scripts, not the Next app —
    // their `useX` helpers trip the React hooks rules. .next is generated.
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "scripts/**", "coverage/**"],
  },
  ...next,
  {
    rules: {
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
];

export default config;
