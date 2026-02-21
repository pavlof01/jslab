/**
 * Integration test для Algorithm Executors
 * Демонстрирует полный flow работы с трассировкой алгоритмов
 */

import { describe, it, expect } from "@jest/globals";
import {
  executeAlgorithm,
  getTraceStatistics,
  compareInputs,
  EXAMPLES,
  type CoercionRequest,
} from "./executor-usage-examples";
import type { TraceResult } from "../abstract-operations-tracer";

describe("Executor Usage - Integration Tests", () => {
  describe("executeAlgorithm function", () => {
    it("should execute toNumber algorithm", () => {
      const request: CoercionRequest = {
        algorithm: "toNumber",
        input: 42,
      };

      const result = executeAlgorithm(request);

      expect(result.algorithmId).toBe("toNumber");
      expect(result.finalValue).toBe(42);
      expect(result.success).toBe(true);
    });

    it("should execute stringToNumber algorithm", () => {
      const request: CoercionRequest = {
        algorithm: "stringToNumber",
        input: "42",
      };

      const result = executeAlgorithm(request);

      expect(result.algorithmId).toBe("stringToNumber");
      expect(result.finalValue).toBe(42);
    });

    it("should execute toPrimitive algorithm", () => {
      const request: CoercionRequest = {
        algorithm: "toPrimitive",
        input: 42,
        hint: "number",
      };

      const result = executeAlgorithm(request);

      expect(result.algorithmId).toBe("toPrimitive");
      expect(result.finalValue).toBe(42);
    });

    it("should execute ordinaryToPrimitive algorithm", () => {
      const request: CoercionRequest = {
        algorithm: "ordinaryToPrimitive",
        input: { toString: () => "str" },
        hint: "string",
      };

      const result = executeAlgorithm(request);

      expect(result.algorithmId).toBe("ordinaryToPrimitive");
      expect(result.finalValue).toBe("str");
    });

    it("should handle invalid ordinaryToPrimitive input", () => {
      const request: CoercionRequest = {
        algorithm: "ordinaryToPrimitive",
        input: 42, // Not an object
        hint: "string",
      };

      const result = executeAlgorithm(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("Real-world scenarios", () => {
    it("should trace coercion: string to number with object", () => {
      const input = { valueOf: () => 42 };
      const result = executeAlgorithm({
        algorithm: "toNumber",
        input,
      });

      expect(result.finalValue).toBe(42);
      expect(result.success).toBe(true);

      // Should have nested traces for ToPrimitive
      const hasNested = result.steps.some((step) => step.nestedTrace?.algorithmId === "toPrimitive");
      expect(hasNested).toBe(true);
    });

    it("should trace coercion: string that looks like number", () => {
      const result = executeAlgorithm({
        algorithm: "toNumber",
        input: "  123.45  ",
      });

      expect(result.finalValue).toBe(123.45);
      expect(result.success).toBe(true);

      // Should have StringToNumber trace
      const hasStringToNumber = result.steps.some((step) => step.nestedTrace?.algorithmId === "stringToNumber");
      expect(hasStringToNumber).toBe(true);
    });

    it("should handle complex object with Symbol.toPrimitive", () => {
      const input = {
        [Symbol.toPrimitive]: () => 999,
        valueOf: () => 111,
        toString: () => "222",
      };

      const result = executeAlgorithm({
        algorithm: "toPrimitive",
        input,
        hint: "number",
      });

      expect(result.finalValue).toBe(999);
      expect(result.success).toBe(true);
    });

    it("should handle fallback from valueOf to toString", () => {
      const input = {
        valueOf: () => ({}), // Returns object, so should fall back to toString
        toString: () => "42",
      };

      const result = executeAlgorithm({
        algorithm: "ordinaryToPrimitive",
        input,
        hint: "number",
      });

      expect(result.finalValue).toBe("42");
      expect(result.success).toBe(true);
    });
  });

  describe("compareInputs function", () => {
    it("should compare multiple inputs", () => {
      const inputs = [42, true, false, null, undefined];
      const results = compareInputs("toNumber", inputs);

      expect(results).toHaveLength(inputs.length);
      expect(results[0].finalValue).toBe(42);
      expect(results[1].finalValue).toBe(1);
      expect(results[2].finalValue).toBe(0);
      expect(results[3].finalValue).toBe(0);
      expect(isNaN(results[4].finalValue as number)).toBe(true);
    });

    it("should compare string inputs", () => {
      const inputs = ["", "42", "  123  ", "Infinity", "abc"];
      const results = compareInputs("stringToNumber", inputs);

      expect(results[0].finalValue).toBe(0);
      expect(results[1].finalValue).toBe(42);
      expect(results[2].finalValue).toBe(123);
      expect(results[3].finalValue).toBe(Infinity);
      expect(isNaN(results[4].finalValue as number)).toBe(true);
    });
  });

  describe("getTraceStatistics function", () => {
    it("should count steps correctly", () => {
      const result = executeAlgorithm({
        algorithm: "toNumber",
        input: 42,
      });

      const stats = getTraceStatistics(result);

      expect(stats.totalSteps).toBeGreaterThan(0);
      expect(stats.success).toBe(true);
      expect(stats.input).toBe(42);
      expect(stats.output).toBe(42);
    });

    it("should track algorithm calls", () => {
      const result = executeAlgorithm({
        algorithm: "toNumber",
        input: { toString: () => "42" },
      });

      const stats = getTraceStatistics(result);

      // Should have toNumber, toPrimitive, stringToNumber
      expect(stats.algorithms).toContain("toNumber");
      expect(stats.algorithms.length).toBeGreaterThan(1);
      console.log("should track algorithm calls", result);
    });

    it("should mark failed executions", () => {
      const result = executeAlgorithm({
        algorithm: "ordinaryToPrimitive",
        input: 42, // Invalid input
      });

      const stats = getTraceStatistics(result);

      expect(stats.success).toBe(false);
      expect(stats.output).toBeUndefined();
    });
  });

  describe("Examples library", () => {
    it("should have examples for toNumber", () => {
      expect(EXAMPLES.toNumber.length).toBeGreaterThan(0);

      for (const example of EXAMPLES.toNumber) {
        const result = executeAlgorithm({
          algorithm: "toNumber",
          input: example.input,
        });

        expect(result.success).toBe(true);
        expect(result.finalValue).toBeDefined();
      }
    });

    it("should have examples for stringToNumber", () => {
      expect(EXAMPLES.stringToNumber.length).toBeGreaterThan(0);

      for (const example of EXAMPLES.stringToNumber) {
        const result = executeAlgorithm({
          algorithm: "stringToNumber",
          input: example.input,
        });

        expect(result.success).toBe(true);
      }
    });

    it("should have examples for toPrimitive", () => {
      expect(EXAMPLES.toPrimitive.length).toBeGreaterThan(0);

      for (const example of EXAMPLES.toPrimitive) {
        const result = executeAlgorithm({
          algorithm: "toPrimitive",
          input: example.input,
        });

        expect(result.success).toBe(true);
      }
    });

    it("should have examples for ordinaryToPrimitive", () => {
      expect(EXAMPLES.ordinaryToPrimitive.length).toBeGreaterThan(0);

      for (const example of EXAMPLES.ordinaryToPrimitive) {
        const result = executeAlgorithm({
          algorithm: "ordinaryToPrimitive",
          input: example.input,
          hint: "number",
        });

        expect(result.success).toBe(true);
      }
    });
  });

  describe("Trace structure validation", () => {
    it("should have valid trace structure for simple case", () => {
      const result = executeAlgorithm({
        algorithm: "toNumber",
        input: 42,
      });

      validateTraceStructure(result);
    });

    it("should have valid trace structure for complex case", () => {
      const result = executeAlgorithm({
        algorithm: "toNumber",
        input: { valueOf: () => 42 },
      });

      validateTraceStructure(result);
    });

    function validateTraceStructure(trace: TraceResult) {
      // Basic properties
      expect(trace.algorithmId).toBeDefined();
      expect(trace.algorithmName).toBeDefined();
      expect(trace.algorithmDescription).toBeDefined();
      expect(typeof trace.success).toBe("boolean");
      expect(Array.isArray(trace.steps)).toBe(true);

      // Validate steps
      for (const step of trace.steps) {
        expect(step.kind).toBeDefined();
        expect(step.description).toBeDefined();
        expect(typeof step.executed).toBe("boolean");

        // Validate nested structures
        if (step.subSteps) {
          expect(Array.isArray(step.subSteps)).toBe(true);
          for (const subStep of step.subSteps) {
            expect(subStep.kind).toBeDefined();
          }
        }

        if (step.nestedTrace) {
          validateTraceStructure(step.nestedTrace);
        }
      }
    }
  });

  describe("Edge cases", () => {
    it("should handle null input", () => {
      const result = executeAlgorithm({
        algorithm: "toNumber",
        input: null,
      });

      expect(result.finalValue).toBe(0);
      expect(result.success).toBe(true);
    });

    it("should handle NaN gracefully", () => {
      const result = executeAlgorithm({
        algorithm: "toNumber",
        input: NaN,
      });

      expect(isNaN(result.finalValue as number)).toBe(true);
      expect(result.success).toBe(true);
    });

    it("should handle Infinity", () => {
      const result = executeAlgorithm({
        algorithm: "toNumber",
        input: Infinity,
      });

      expect(result.finalValue).toBe(Infinity);
      expect(result.success).toBe(true);
    });

    it("should handle negative zero", () => {
      const result = executeAlgorithm({
        algorithm: "toNumber",
        input: -0,
      });

      expect(Object.is(result.finalValue, -0) || result.finalValue === 0).toBe(true);
      expect(result.success).toBe(true);
    });
  });
});
