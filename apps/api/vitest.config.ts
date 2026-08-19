import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // json-summary is what a CI upload or a badge reads; lcov is the HTML report.
    coverage: { reporter: ['text', 'json-summary', 'lcov'] },
    // Module-level `vi.fn()`s are shared between tests here; without this a
    // later assertion can be satisfied by an earlier test's call.
    clearMocks: true,
    // `npm run build` emits compiled copies of the test files into dist/, and
    // vitest's default glob picks those up too — they then resolve their
    // fixture paths relative to dist/ and fail. Only src/ holds real tests.
    include: ["src/**/*.test.ts"],
  },
});
