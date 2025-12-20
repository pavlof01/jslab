
import { describe, expect, it } from "@jest/globals";
import { BigIntIsEqual } from "./BigIntIsEqual";

describe("BigIntIsEqual", () => {
  it("returns true for equal BigInts", () => {
    expect(BigIntIsEqual(BigInt(1), BigInt(1))).toBe(true);
    expect(BigIntIsEqual(0n, 0n)).toBe(true);
    expect(BigIntIsEqual(-12345678901234567890n, -12345678901234567890n)).toBe(true);
  });

  it("returns false for different BigInts", () => {
    expect(BigIntIsEqual(BigInt(1), BigInt(2))).toBe(false);
    expect(BigIntIsEqual(0n, 1n)).toBe(false);
    expect(BigIntIsEqual(-1n, 1n)).toBe(false);
  });
});
