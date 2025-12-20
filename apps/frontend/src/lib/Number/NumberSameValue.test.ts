
import { describe, expect, it } from "@jest/globals";
import { NumberSameValue } from "./NumberSameValue";

describe("NumberSameValue", () => {
  it("returns true if x and y are both NaN (step 1)", () => {
    expect(NumberSameValue(NaN, NaN)).toBe(true);
  });

  it("returns false if x is +0 and y is -0 (step 2)", () => {
    expect(NumberSameValue(0, -0)).toBe(false);
  });

  it("returns false if x is -0 and y is +0 (step 3)", () => {
    expect(NumberSameValue(-0, 0)).toBe(false);
  });

  it("returns true if x is the same Number value as y (step 4)", () => {
    expect(NumberSameValue(5, 5)).toBe(true);
    expect(NumberSameValue(-10, -10)).toBe(true);
    expect(NumberSameValue(Infinity, Infinity)).toBe(true);
    expect(NumberSameValue(-Infinity, -Infinity)).toBe(true);
    expect(NumberSameValue(0, 0)).toBe(true);
    expect(NumberSameValue(-0, -0)).toBe(true);
  });

  it("returns false for all other cases (step 5)", () => {
    expect(NumberSameValue(1, 2)).toBe(false);
    expect(NumberSameValue(0, 1)).toBe(false);
    expect(NumberSameValue(Infinity, -Infinity)).toBe(false);
    expect(NumberSameValue(5, NaN)).toBe(false);
    expect(NumberSameValue(NaN, 5)).toBe(false);
  });
});
