import { describe, expect, it } from "@jest/globals";
import { SameType } from "./SameType";

describe("SameType", () => {
  it("returns true for identical primitives of the same ECMAScript type", () => {
    expect(SameType(undefined, undefined)).toBe(true);
    expect(SameType(null, null)).toBe(true);
    expect(SameType(true, false)).toBe(true);
    expect(SameType(1, NaN)).toBe(true); // both Number
    expect(SameType(1n, 2n)).toBe(true); // both BigInt
    expect(SameType(Symbol.iterator, Symbol("x"))).toBe(true);
    expect(SameType("a", "b")).toBe(true);
  });

  it("returns true for Objects (including different object identities)", () => {
    expect(SameType({}, { a: 1 })).toBe(true);
    expect(SameType([], new Date())).toBe(true);
    expect(SameType(new Map(), Object.create(null))).toBe(true);
  });

  it("returns false for mixed types", () => {
    expect(SameType(undefined, null)).toBe(false);
    expect(SameType(null, 0)).toBe(false);
    expect(SameType(false, 0)).toBe(false);
    expect(SameType("1", 1)).toBe(false);
    expect(SameType(1, 1n)).toBe(false);
    expect(SameType(Symbol("s"), "s")).toBe(false);
    expect(SameType({}, "object")).toBe(false);
    expect(SameType([], 0)).toBe(false);
  });
});
