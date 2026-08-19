import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.mts", "src/**/*.spec.mts", "test/**/*.test.mts", "test/**/*.spec.mts"],
    watch: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
