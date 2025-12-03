
import { describe, expect, it } from "@jest/globals";
import { NumberIsEqual } from "./NumberIsEqual";

describe("NumberIsEqual", () => {
  it("returns false if x is NaN (step 1)", () => {
    expect(NumberIsEqual(NaN, 5)).toBe(false);
    expect(NumberIsEqual(NaN, NaN)).toBe(false);
  });

  it("returns false if y is NaN (step 2)", () => {
    expect(NumberIsEqual(5, NaN)).toBe(false);
  });

  it("returns true if x is the same Number value as y (step 3)", () => {
    expect(NumberIsEqual(5, 5)).toBe(true);
    expect(NumberIsEqual(-10, -10)).toBe(true);
    expect(NumberIsEqual(Infinity, Infinity)).toBe(true);
    expect(NumberIsEqual(-Infinity, -Infinity)).toBe(true);
  });

  it("returns true for +0 and -0 (step 4)", () => {
    expect(NumberIsEqual(0, -0)).toBe(true);
  });

  it("returns true for -0 and +0 (step 5)", () => {
    expect(NumberIsEqual(-0, 0)).toBe(true);
  });

  it("returns true for +0 and +0", () => {
    expect(NumberIsEqual(0, 0)).toBe(true);
  });

  it("returns true for -0 and -0", () => {
    expect(NumberIsEqual(-0, -0)).toBe(true);
  });

  it("returns false for different numbers (step 6)", () => {
    expect(NumberIsEqual(1, 2)).toBe(false);
    expect(NumberIsEqual(0, 1)).toBe(false);
    expect(NumberIsEqual(Infinity, -Infinity)).toBe(false);
  });
});
