// Types are the ones this repo's history actually uses; everything else comes
// from config-conventional. Scopes are deliberately open — a new service should
// not need a commit that registers its name before it can be committed.
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "chore",
        "docs",
        "ci",
        "test",
        "refactor",
        "perf",
        "style",
        "infra",
        "revert",
      ],
    ],
    "body-max-line-length": [0],
    "footer-max-line-length": [0],
    "subject-case": [0],
  },
};
