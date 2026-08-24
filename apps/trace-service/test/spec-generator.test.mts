/**
 * The spec panel is built by running ecma-spec.html through ecmarkup and
 * slicing out one <emu-clause> per algorithm. What matters is that every
 * function the service can trace also has spec HTML to show beside the trace,
 * and that a clause carries the id and outbound link the UI depends on.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeBinaryExpression, executeUnaryConversion } from "../src/server/execute/index.ts";
import { ALGO_SPEC_URL, buildSpecHtmlForFunction } from "../src/server/spec-generator.ts";
import { AVAILABLE_FUNCTIONS, SUPPORTED_SPEC_FUNCTIONS } from "../src/server/operations.ts";

describe("SUPPORTED_SPEC_FUNCTIONS", () => {
  it("covers every executable type-conversion operation", () => {
    // A traceable function with no spec HTML renders as an empty panel.
    for (const name of AVAILABLE_FUNCTIONS) {
      expect(SUPPORTED_SPEC_FUNCTIONS, `${name} has no spec clauses`).toContain(name);
    }
  });

  it("covers the equality entry points too", () => {
    for (const name of ["IsLooselyEqual", "IsStrictlyEqual", "AbstractRelationalComparison"]) {
      expect(SUPPORTED_SPEC_FUNCTIONS).toContain(name);
    }
  });
});

describe("ALGO_SPEC_URL", () => {
  it("points every entry at the published specification", () => {
    for (const [algo, url] of Object.entries(ALGO_SPEC_URL)) {
      expect(url, algo).toMatch(/^https:\/\/262\.ecma-international\.org\/#sec-/);
    }
  });

  it("has a URL for each top-level function the panel can show", () => {
    for (const name of AVAILABLE_FUNCTIONS) {
      expect(ALGO_SPEC_URL[name], `${name} has no spec URL`).toBeDefined();
    }
  });
});

describe("buildSpecHtmlForFunction", () => {
  it(
    "renders the requested algorithm and the sub-algorithms it reaches",
    async () => {
      const html = await buildSpecHtmlForFunction("ToNumber");

      expect(html).toBeTruthy();
      expect(html).toContain('<emu-clause id="ToNumber"');
      // ToNumber of an object goes through ToPrimitive; the panel shows both.
      expect(html).toContain('id="ToPrimitive"');
      expect(html).toContain("<emu-alg");
    },
    60_000,
  );

  it(
    "links each clause out to the specification it came from",
    async () => {
      const html = (await buildSpecHtmlForFunction("ToBoolean"))!;
      expect(html).toContain(ALGO_SPEC_URL.ToBoolean);
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain('aria-label="Open ToBoolean in ECMAScript specification"');
    },
    60_000,
  );

  it(
    "renders every supported function to non-empty HTML",
    async () => {
      for (const name of SUPPORTED_SPEC_FUNCTIONS) {
        const html = await buildSpecHtmlForFunction(name);
        expect(html, `${name} rendered nothing`).toBeTruthy();
      }
    },
    120_000,
  );

  it("returns null for a function it has no algorithm list for", async () => {
    expect(await buildSpecHtmlForFunction("NotAnOperation")).toBeNull();
  });
});

describe("step anchors", () => {
  const extractStepId = (hint: string | undefined): string | null => {
    const m = hint?.match(/^Step (\d+(?:[a-z](?:-[a-zA-Z0-9]+)?)?)/i);
    return m ? m[1] : null;
  };

  const specHtml = readFileSync(new URL("../src/server/ecma-spec.html", import.meta.url), "utf8");

  type Node = { algoId?: string; steps?: Array<{ hint?: string; algoId?: string; steps?: unknown }> };

  const collect = (node: Node | undefined, into: Array<[string, string]>): void => {
    const algoId = node?.algoId;
    for (const step of node?.steps ?? []) {
      const stepId = extractStepId(step.hint);
      if (algoId && stepId) into.push([algoId, stepId]);
      collect(step as Node, into);
    }
  };

  const hasAnchors = (algoId: string) => specHtml.includes(`"${algoId}-step-`);

  const binaryInputs = ["[] + {}", "1n + 2n", "[] == ![]", "1 < 2", "'a' === 'a'"];
  const unaryInputs: Array<[string, string]> = [
    ["ToNumber", "'42'"],
    ["ToNumeric", "10n"],
    ["ToString", "{ toString: () => 'x' }"],
    ["ToBoolean", "0"],
    ["ToPrimitive", "{ valueOf: () => 1 }"],
    ["ToObject", "'hi'"],
    ["ToPropertyKey", "2"],
    ["ToLength", "-5"],
    ["ToIndex", "3"],
  ];

  it.each(binaryInputs)("resolves every step hint of %s to a clause id", async (expression) => {
    const result = await executeBinaryExpression(expression);
    expect(result.success, result.error).toBe(true);

    const pairs: Array<[string, string]> = [];
    collect(result.root as Node, pairs);
    expect(pairs.length).toBeGreaterThan(0);

    for (const [algoId, stepId] of pairs) {
      if (!hasAnchors(algoId)) continue;
      expect(specHtml, `${algoId} has no anchor for step ${stepId}`).toContain(`"${algoId}-step-${stepId}"`);
    }
  });

  it.each(unaryInputs)("resolves every step hint of %s to a clause id", async (fn, input) => {
    const result = await executeUnaryConversion(fn, input);
    expect(result.success, result.error).toBe(true);

    const pairs: Array<[string, string]> = [];
    collect(result.root as Node, pairs);

    for (const [algoId, stepId] of pairs) {
      if (!hasAnchors(algoId)) continue;
      expect(specHtml, `${algoId} has no anchor for step ${stepId}`).toContain(`"${algoId}-step-${stepId}"`);
    }
  });

  it("actually checks anchored algorithms, so a dropped anchor set cannot pass by skipping", async () => {
    const checked = new Set<string>();
    const record = (pairs: Array<[string, string]>) => {
      for (const [algoId, stepId] of pairs) {
        if (!hasAnchors(algoId)) continue;
        expect(specHtml, `${algoId} step ${stepId} unanchored`).toContain(`"${algoId}-step-${stepId}"`);
        checked.add(algoId);
      }
    };

    for (const expr of binaryInputs) {
      const r = await executeBinaryExpression(expr);
      const pairs: Array<[string, string]> = [];
      collect(r.root as Node, pairs);
      record(pairs);
    }
    for (const [fn, input] of unaryInputs) {
      const r = await executeUnaryConversion(fn, input);
      const pairs: Array<[string, string]> = [];
      collect(r.root as Node, pairs);
      record(pairs);
    }

    for (const core of ["ToNumber", "ToString", "ApplyStringOrNumericBinaryOperator"]) {
      expect(checked, `${core} never had an anchor checked — its clause lost its step ids`).toContain(core);
    }
  });
});
