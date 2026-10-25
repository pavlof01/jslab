/**
 * @jest-environment node
 */
import { beforeAll, describe, expect, it } from "@jest/globals";

import { loadAnnotationParser, matchAnnotations, parseAnnotationSource } from "./annotations";
import { sampleCatalog, samples, v8SampleCatalog, v8Samples } from "./samples";
import { DEFAULT_V8_FLAGS } from "./v8Flags";

const RUN_URL = process.env.SAMPLES_RUN_URL;
const describeOnEngine = RUN_URL ? describe : describe.skip;

type RunResult = { ok: boolean; stdout: string; stderr: string };

async function runOnV8(sourceText: string, flags: readonly string[]): Promise<RunResult> {
  const response = await fetch(RUN_URL!, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ engine: "v8", sourceText, options: { flags } }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`run failed with HTTP ${response.status}: ${body}`);
  const result = JSON.parse(body) as Partial<RunResult>;
  return { ok: Boolean(result.ok), stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

const CRASH = /Fatal error|Check failed|should be prepared for optimization/;

beforeAll(() => loadAnnotationParser());

describeOnEngine("samples on a real d8", () => {
  it.each(v8SampleCatalog)(
    "$key: every annotation finds its output",
    async ({ key, flags }) => {
      const source = v8Samples[key];
      const result = await runOnV8(source, flags);
      expect(`${result.stdout}\n${result.stderr}`).not.toMatch(CRASH);

      const parsed = parseAnnotationSource(source);
      expect(parsed.diagnostics).toEqual([]);
      const matched = new Set(
        [result.stdout, result.stderr].flatMap((channel) =>
          matchAnnotations(parsed, channel).annotations.map(({ id }) => id.split("-")[1]),
        ),
      );
      const unmatched = parsed.rules
        .filter((_rule, order) => !matched.has(String(order)))
        .map((rule) => rule.match);
      expect(unmatched).toEqual([]);
    },
    30_000,
  );

  it.each(sampleCatalog)(
    "$key runs with the default flags without crashing d8",
    async ({ key }) => {
      const result = await runOnV8(samples[key], DEFAULT_V8_FLAGS);
      expect(`${result.stdout}\n${result.stderr}`).not.toMatch(CRASH);
    },
    30_000,
  );
});
