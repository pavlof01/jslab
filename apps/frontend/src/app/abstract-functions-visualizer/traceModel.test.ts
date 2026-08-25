import { describe, expect, it } from "@jest/globals";

import type { SpecValue } from "./spec-runner";
import { formatNodePath, formatSpecValue } from "./traceModel";

describe("formatNodePath", () => {
  it("says nothing for an absent or empty path", () => {
    expect(formatNodePath()).toBe("");
    expect(formatNodePath([])).toBe("");
  });

  it("renders numeric steps one-based, as the spec numbers them", () => {
    expect(formatNodePath([0])).toBe("1");
    expect(formatNodePath([0, 2])).toBe("1 › 3");
  });

  it("keeps branch labels readable", () => {
    expect(formatNodePath([1, "then", 0])).toBe("2 › then › 1");
    expect(formatNodePath([1, "else"])).toBe("2 › else");
  });

  it("passes any other string segment through", () => {
    expect(formatNodePath(["substeps", 0])).toBe("substeps › 1");
  });
});

describe("formatSpecValue", () => {
  const cases: Array<[string, SpecValue, string]> = [
    ["undefined", { type: "Undefined" }, "undefined"],
    ["null", { type: "Null", value: null }, "null"],
    ["true", { type: "Boolean", value: true }, "true"],
    ["a number", { type: "Number", value: 42 }, "42"],
    ["NaN", { type: "Number", value: "NaN" }, "NaN"],
    ["a string, quoted", { type: "String", value: "hi" }, '"hi"'],
    ["a bigint with its suffix", { type: "BigInt", value: "10" }, "10n"],
    ["an array as JSON", { type: "Array", value: [1, "a"] }, '[1,"a"]'],
    ["a type tag", { type: "TypeTag", value: "Object" }, "TypeTag(Object)"],
  ];

  it.each(cases)("renders %s", (_label, value, expected) => {
    expect(formatSpecValue(value)).toBe(expected);
  });

  it("distinguishes -0 from 0, which the spec cares about", () => {
    expect(formatSpecValue({ type: "Number", value: -0 })).toBe("-0");
    expect(formatSpecValue({ type: "Number", value: 0 })).toBe("0");
  });

  it("renders a symbol with its description and identity", () => {
    expect(formatSpecValue({ type: "Symbol", value: { id: "s1", description: "tag" } })).toBe(
      'Symbol("tag")@s1',
    );
    expect(formatSpecValue({ type: "Symbol", value: { id: "s2" } })).toBe("Symbol()@s2");
  });

  it("prefers an object's preview over its identity", () => {
    expect(
      formatSpecValue({
        type: "Object",
        value: { id: "o1", class: "Object", preview: "{ a: 1 }" },
      }),
    ).toBe("Object({ a: 1 })");
    expect(formatSpecValue({ type: "Object", value: { id: "o2", class: "Object" } })).toBe(
      "Object#o2",
    );
  });

  it("falls back to the class name when a preview has no class", () => {
    expect(
      formatSpecValue({ type: "Object", value: { id: "o3", class: "", preview: "[1, 2]" } }),
    ).toBe("[1, 2]");
  });

  it("truncates past the length cap with an ellipsis", () => {
    const long = formatSpecValue({ type: "String", value: "x".repeat(100) }, 10);
    expect(long).toHaveLength(10);
    expect(long.endsWith("…")).toBe(true);
  });

  it("leaves a value exactly at the cap alone", () => {
    expect(formatSpecValue({ type: "String", value: "abcd" }, 6)).toBe('"abcd"');
  });
});
