import { describe, expect, it } from "@jest/globals";
import { StringIsEqual } from "./StringIsEqual";

// Tests
describe("StringIsEqual", () => {
  it("should return true for identical strings", () => {
    expect(StringIsEqual("hello", "hello")).toBe(true);
  });

  it("should return true for empty strings", () => {
    expect(StringIsEqual("", "")).toBe(true);
  });

  it("should return false for strings with different content but same length", () => {
    expect(StringIsEqual("hello", "world")).toBe(false);
  });

  it("should return false for strings with different lengths", () => {
    expect(StringIsEqual("hello", "hell")).toBe(false);
    expect(StringIsEqual("hell", "hello")).toBe(false);
  });

  it("should return false for strings with different casing", () => {
    expect(StringIsEqual("Hello", "hello")).toBe(false);
  });

  it("should return true for strings with special characters", () => {
    expect(StringIsEqual("!@#$%^&*()", "!@#$%^&*()")).toBe(true);
  });

  it("should return false for an empty string and a non-empty string", () => {
    expect(StringIsEqual("", "a")).toBe(false);
    expect(StringIsEqual("a", "")).toBe(false);
  });

  it("should handle unicode characters correctly", () => {
    expect(StringIsEqual("你好", "你好")).toBe(true);
    expect(StringIsEqual("你好", "你好吗")).toBe(false);
    expect(StringIsEqual("你好", "你坏")).toBe(false);
  });

  it("should handle strings with only whitespace", () => {
    expect(StringIsEqual(" ", " ")).toBe(true);
    expect(StringIsEqual("  ", " ")).toBe(false);
    expect(StringIsEqual("\t", "\t")).toBe(true);
    expect(StringIsEqual("\n", "\n")).toBe(true);
  });
});
