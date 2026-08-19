import { transform } from 'esbuild';
import { defineConfig, type Plugin } from 'vitest/config';

/**
 * engine262 is vendored as TypeScript sources, and it decorates its classes.
 *
 * Vite transforms the whole tree against the root tsconfig, which does not turn
 * decorators on, so esbuild leaves them in the output — and the module runner
 * compiles each module with `new AsyncFunction`, which cannot parse a decorator.
 * `tsx`, which runs the service in dev and in production, reads the tsconfig
 * sitting next to each file and so transforms them away. This does the same for
 * the test run, and only for those files.
 */
function engine262Sources(): Plugin {
  return {
    name: 'engine262-sources',
    enforce: 'pre',
    async transform(code, id) {
      if (!id.includes('/engine262/src/') || !/\.m?ts$/.test(id)) return null;

      const out = await transform(code, {
        loader: 'ts',
        format: 'esm',
        sourcefile: id,
        sourcemap: true,
        tsconfigRaw: { compilerOptions: { experimentalDecorators: true, useDefineForClassFields: false } },
      });
      return { code: out.code, map: out.map };
    },
  };
}

export default defineConfig({
  plugins: [engine262Sources()],
  test: {
    // json-summary is what a CI upload or a badge reads; lcov is the HTML report.
    coverage: { reporter: ['text', 'json-summary', 'lcov'] },
    include: ['src/**/*.test.mts', 'src/**/*.spec.mts', 'test/**/*.test.mts', 'test/**/*.spec.mts'],
    watch: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
