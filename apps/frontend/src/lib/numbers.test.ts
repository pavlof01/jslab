import { describe, expect, it } from "@jest/globals";

import { clamp, finiteOr, toPositiveInt, withinOr } from "./numbers";

describe("finiteOr", () => {
  it("returns the parsed number when it is finite", () => {
    expect(finiteOr(42, 0)).toBe(42);
    expect(finiteOr("42", 0)).toBe(42);
    expect(finiteOr("3.5", 0)).toBe(3.5);
    expect(finiteOr("-1", 0)).toBe(-1);
  });

  it("falls back for anything that is not a finite number", () => {
    expect(finiteOr("abc", 7)).toBe(7);
    expect(finiteOr(undefined, 7)).toBe(7);
    expect(finiteOr(null, 7)).toBe(0); // Number(null) === 0, which is finite
    expect(finiteOr(Number.NaN, 7)).toBe(7);
    expect(finiteOr(Number.POSITIVE_INFINITY, 7)).toBe(7);
    expect(finiteOr({}, 7)).toBe(7);
  });
});

describe("toPositiveInt", () => {
  it("rounds up to the next integer", () => {
    expect(toPositiveInt(1)).toBe(1);
    expect(toPositiveInt(1.1)).toBe(2);
    expect(toPositiveInt("2.9")).toBe(3);
  });

  it("returns undefined for zero, negatives and non-numbers", () => {
    expect(toPositiveInt(0)).toBeUndefined();
    expect(toPositiveInt(-3)).toBeUndefined();
    expect(toPositiveInt("nope")).toBeUndefined();
    expect(toPositiveInt(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(toPositiveInt(undefined)).toBeUndefined();
  });
});

describe("clamp", () => {
  it("keeps a value inside the range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it("returns the bound when the range is a single point", () => {
    expect(clamp(3, 1, 1)).toBe(1);
  });
});

describe("withinOr", () => {
  const bounds = { min: 0, max: 100, fallback: 50 };

  it("accepts a value strictly inside the bounds", () => {
    expect(withinOr(10, bounds)).toBe(10);
    expect(withinOr("10", bounds)).toBe(10);
  });

  it("rejects the bounds themselves — the range is exclusive", () => {
    expect(withinOr(0, bounds)).toBe(50);
    expect(withinOr(100, bounds)).toBe(50);
  });

  it("falls back for values outside the range or not numeric", () => {
    expect(withinOr(-1, bounds)).toBe(50);
    expect(withinOr(1000, bounds)).toBe(50);
    expect(withinOr("abc", bounds)).toBe(50);
    expect(withinOr(undefined, bounds)).toBe(50);
  });
});
