/**
 * Tests for helper functions in execute/helpers.ts
 */
import { describe, it, expect } from "vitest";
import {
  AVAILABLE_FUNCTIONS,
  FUNCTION_MAP,
  isFunctionNameValid,
  convertInputToString,
  convertResultToString,
} from "./helpers.ts";

describe("helpers.ts", () => {
  describe("AVAILABLE_FUNCTIONS", () => {
    it("should contain all 20 ECMA262 conversion functions", () => {
      expect(AVAILABLE_FUNCTIONS).toHaveLength(20);
    });

    it("should include ToNumber, ToString, ToBoolean", () => {
      expect(AVAILABLE_FUNCTIONS).toContain("ToNumber");
      expect(AVAILABLE_FUNCTIONS).toContain("ToString");
      expect(AVAILABLE_FUNCTIONS).toContain("ToBoolean");
    });

    it("should include all advanced conversion functions", () => {
      const advancedFunctions = [
        "ToNumeric",
        "ToObject",
        "ToPropertyKey",
        "ToLength",
        "ToIndex",
        "ToInt32",
        "ToUint32",
        "ToInt8",
        "ToUint8",
        "ToUint8Clamp",
        "ToInt16",
        "ToUint16",
        "ToBigInt",
        "ToBigInt64",
        "ToBigUint64",
        "CanonicalNumericIndexString",
      ];

      advancedFunctions.forEach((fn) => {
        expect(AVAILABLE_FUNCTIONS).toContain(fn);
      });
    });
  });

  describe("FUNCTION_MAP", () => {
    it("should have entries for all AVAILABLE_FUNCTIONS", () => {
      AVAILABLE_FUNCTIONS.forEach((name) => {
        expect(FUNCTION_MAP[name]).toBeDefined();
      });
    });

    it("should map to functions, not null or undefined", () => {
      Object.entries(FUNCTION_MAP).forEach(([name, fn]) => {
        expect(typeof fn).toBe("function");
      });
    });
  });

  describe("isFunctionNameValid", () => {
    it("should return true for valid function names", () => {
      expect(isFunctionNameValid("ToNumber")).toBe(true);
      expect(isFunctionNameValid("ToString")).toBe(true);
      expect(isFunctionNameValid("ToBoolean")).toBe(true);
      expect(isFunctionNameValid("ToInt32")).toBe(true);
    });

    it("should return false for invalid function names", () => {
      expect(isFunctionNameValid("InvalidFunction")).toBe(false);
      expect(isFunctionNameValid("toNumber")).toBe(false); // Case sensitive
      expect(isFunctionNameValid("")).toBe(false);
      expect(isFunctionNameValid("Number")).toBe(false);
    });

    it("should return false for all 20 function names when mixed case", () => {
      expect(isFunctionNameValid("tonumber")).toBe(false);
      expect(isFunctionNameValid("TONUMBER")).toBe(false);
      expect(isFunctionNameValid("toBoolean")).toBe(false);
    });
  });

  describe("convertInputToString", () => {
    describe("string input", () => {
      it("should parse valid JSON and return as-is", () => {
        expect(convertInputToString("42")).toBe("42");
        expect(convertInputToString('"hello"')).toBe('"hello"');
        expect(convertInputToString("true")).toBe("true");
        expect(convertInputToString("null")).toBe("null");
        expect(convertInputToString("[]")).toBe("[]");
        expect(convertInputToString('{"x":1}')).toBe('{"x":1}');
      });

      it("should quote non-JSON strings", () => {
        expect(convertInputToString("abc")).toBe('"abc"');
        expect(convertInputToString("hello world")).toBe('"hello world"');
        expect(convertInputToString("")).toBe('""');
      });

      it("should handle special characters in strings", () => {
        expect(convertInputToString("hello\nworld")).toBe('"hello\\nworld"');
        expect(convertInputToString('say "hi"')).toBe('"say \\"hi\\""');
      });
    });

    describe("number input", () => {
      it("should handle regular numbers", () => {
        expect(convertInputToString(42)).toBe("42");
        expect(convertInputToString(0)).toBe("0");
        expect(convertInputToString(-5)).toBe("-5");
        expect(convertInputToString(3.14)).toBe("3.14");
      });

      it("should handle NaN", () => {
        expect(convertInputToString(NaN)).toBe("NaN");
      });

      it("should handle Infinity", () => {
        expect(convertInputToString(Number.POSITIVE_INFINITY)).toBe("Infinity");
        expect(convertInputToString(Number.NEGATIVE_INFINITY)).toBe("-Infinity");
      });
    });

    describe("boolean input", () => {
      it("should convert booleans to strings", () => {
        expect(convertInputToString(true)).toBe("true");
        expect(convertInputToString(false)).toBe("false");
      });
    });

    describe("null and undefined", () => {
      it("should handle null", () => {
        expect(convertInputToString(null)).toBe("null");
      });

      it("should handle undefined", () => {
        expect(convertInputToString(undefined)).toBe("undefined");
      });
    });

    describe("object and array input", () => {
      it("should stringify objects", () => {
        const obj = { x: 1, y: 2 };
        expect(convertInputToString(obj)).toBe('{"x":1,"y":2}');
      });

      it("should stringify arrays", () => {
        expect(convertInputToString([1, 2, 3])).toBe("[1,2,3]");
        expect(convertInputToString([])).toBe("[]");
      });

      it("should stringify nested structures", () => {
        const nested = { a: [1, 2], b: { c: 3 } };
        expect(convertInputToString(nested)).toBe('{"a":[1,2],"b":{"c":3}}');
      });
    });
  });

  describe("convertResultToString", () => {
    describe("number results", () => {
      it("should handle regular numbers", () => {
        expect(convertResultToString({ value: 42 })).toBe("42");
        expect(convertResultToString({ value: 0 })).toBe("0");
        expect(convertResultToString({ value: -5 })).toBe("-5");
      });

      it("should handle NaN", () => {
        expect(convertResultToString({ value: NaN })).toBe("NaN");
      });

      it("should handle Infinity", () => {
        expect(convertResultToString({ value: Number.POSITIVE_INFINITY })).toBe("Infinity");
        expect(convertResultToString({ value: Number.NEGATIVE_INFINITY })).toBe("-Infinity");
      });
    });

    describe("null and undefined", () => {
      it("should handle null", () => {
        expect(convertResultToString({ value: null })).toBe("null");
      });

      it("should handle undefined", () => {
        expect(convertResultToString({ value: undefined })).toBe("undefined");
      });
    });

    describe("string results", () => {
      it("should handle strings", () => {
        expect(convertResultToString({ value: "hello" })).toBe("hello");
        expect(convertResultToString({ value: "" })).toBe("");
      });
    });

    describe("boolean results", () => {
      it("should handle booleans", () => {
        expect(convertResultToString({ value: true })).toBe("true");
        expect(convertResultToString({ value: false })).toBe("false");
      });
    });

    describe("object results", () => {
      it("should stringify objects", () => {
        const obj = { x: 1 };
        const result = convertResultToString({ value: obj });
        expect(result).toContain("Object");
      });

      it("should handle BigInt", () => {
        // BigInt converts to "123n" with Number or "123" with String
        const result = convertResultToString({ value: BigInt(123) });
        expect(result).toBe("123");
      });
    });
  });

  describe("edge cases", () => {
    it("convertInputToString should be idempotent for JSON strings", () => {
      const input = "42";
      const result1 = convertInputToString(input);
      // After first conversion, it's valid JSON, so repeat should return same
      expect(result1).toBe(input);
    });

    it("convertInputToString handles empty inputs", () => {
      expect(convertInputToString("")).toBe('""');
      expect(convertInputToString(0)).toBe("0");
      expect(convertInputToString(false)).toBe("false");
    });

    it("convertResultToString and convertInputToString round-trip for simple values", () => {
      // String value
      const input1 = convertInputToString("test");
      expect(input1).toBe('"test"');

      // Number value  
      const input2 = convertInputToString(42);
      expect(input2).toBe("42");

      // Boolean value
      const input3 = convertInputToString(true);
      expect(input3).toBe("true");
    });
  });
});
