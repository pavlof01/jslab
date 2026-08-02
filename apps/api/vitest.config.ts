import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // `npm run build` emits compiled copies of the test files into dist/, and
    // vitest's default glob picks those up too — they then resolve their
    // fixture paths relative to dist/ and fail. Only src/ holds real tests.
    include: ["src/**/*.test.ts"],
  },
});
