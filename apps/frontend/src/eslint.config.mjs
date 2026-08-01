import next from "eslint-config-next/core-web-vitals";

const config = [
  {
    // scripts/ holds standalone Node build/dump scripts, not the Next app —
    // their `useX` helpers trip the React hooks rules. .next is generated.
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "scripts/**"],
  },
  ...next,
  {
    // Legacy hotspots and Next 16's newer React-compiler strictness rules are
    // kept as warnings so the gate is additive rather than blocking on
    // pre-existing patterns — tighten to "error" as they get cleaned up.
    rules: {
      "react/no-array-index-key": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
];

export default config;
