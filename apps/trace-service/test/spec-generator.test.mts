/**
 * The spec panel is built by running ecma-spec.html through ecmarkup and
 * slicing out one <emu-clause> per algorithm. What matters is that every
 * function the service can trace also has spec HTML to show beside the trace,
 * and that a clause carries the id and outbound link the UI depends on.
 */
import { describe, expect, it } from "vitest";
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
