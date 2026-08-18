import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // `npm run build` emits compiled copies of the test files into dist/, and
    // vitest's default glob would pick those up as a second, stale suite.
    include: ["src/**/*.test.ts"],
  },
});
