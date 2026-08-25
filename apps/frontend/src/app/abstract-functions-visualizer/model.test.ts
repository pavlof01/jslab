import { describe, expect, it } from "@jest/globals";

import {
  type AlgoCategory,
  DEFAULTS_BY_CATEGORY,
  EMPTY_FUNCTION_CATALOG,
  fallbackInitialData,
  getDefaultsForCategory,
} from "./model";

const categories: AlgoCategory[] = ["typeConversion", "equality"];

describe("category defaults", () => {
  it("gives every category a starting algorithm and input", () => {
    for (const category of categories) {
      const defaults = getDefaultsForCategory(category);
      expect(defaults.algo.length).toBeGreaterThan(0);
      expect(defaults.input.length).toBeGreaterThan(0);
      expect(defaults).toEqual(DEFAULTS_BY_CATEGORY[category]);
    }
  });

  it("starts equality on the binary entry point", () => {
    // The equality page traces a whole expression, not a named unary operation.
    expect(DEFAULTS_BY_CATEGORY.equality.algo).toBe("BinaryExpression");
    expect(DEFAULTS_BY_CATEGORY.equality.input).toContain("==");
  });
});

describe("fallbackInitialData", () => {
  it("renders an empty but usable page when the server data is missing", () => {
    const data = fallbackInitialData("typeConversion");
    expect(data.category).toBe("typeConversion");
    expect(data.selectedAlgo).toBe(DEFAULTS_BY_CATEGORY.typeConversion.algo);
    expect(data.input).toBe(DEFAULTS_BY_CATEGORY.typeConversion.input);
    expect(data.specHtml).toBe("");
    expect(data.functionCatalog).toEqual(EMPTY_FUNCTION_CATALOG);
  });

  it("carries no trace and, importantly, no error to show the user", () => {
    // A missing prefetch is not a failure the visitor needs to see.
    expect(fallbackInitialData("equality").trace).toEqual({
      root: null,
      result: undefined,
      effectiveAlgoId: null,
      detectedOperator: null,
      error: null,
    });
  });

  it("builds a fresh object each call so the store cannot mutate the default", () => {
    const a = fallbackInitialData("equality");
    const b = fallbackInitialData("equality");
    expect(a).not.toBe(b);
    expect(a.trace).not.toBe(b.trace);
  });
});
