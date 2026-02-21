import { describe, it, expect } from "@jest/globals";
import {
  AbstractOperationTracer,
  type AlgorithmSpec,
  type ExecutedStep,
  type TraceResult,
} from "./abstract-operations-tracer";

describe("AbstractOperationTracer", () => {
  // Простой тестовый алгоритм без рекурсии
  const simpleAlgorithm: AlgorithmSpec = {
    id: "simple",
    name: "SimpleAlgorithm",
    description: "A simple test algorithm",
    steps: [
      {
        number: 1,
        kind: "assignment",
        description: "Let x be 42.",
      },
      {
        number: 2,
        kind: "return",
        description: "Return x.",
      },
    ],
  };

  // Алгоритм с подшагами
  const algorithmWithSubSteps: AlgorithmSpec = {
    id: "withSubSteps",
    name: "AlgorithmWithSubSteps",
    description: "Algorithm with substeps",
    steps: [
      {
        number: 1,
        kind: "conditional",
        description: "If condition is true, then",
        subSteps: [
          {
            letter: "a",
            kind: "assignment",
            description: "Let y be 100.",
          },
          {
            letter: "b",
            kind: "return",
            description: "Return y.",
          },
        ],
      },
    ],
  };

  // Алгоритм с вызовом другого алгоритма
  const algorithmWithCall: AlgorithmSpec = {
    id: "withCall",
    name: "AlgorithmWithCall",
    description: "Algorithm that calls another algorithm",
    steps: [
      {
        number: 1,
        kind: "assignment",
        description: "Let result be ? SimpleAlgorithm(input).",
      },
      {
        number: 2,
        kind: "return",
        description: "Return result.",
      },
    ],
  };

  describe("trace() method", () => {
    it("should trace a simple algorithm", () => {
      const result = AbstractOperationTracer.trace(simpleAlgorithm, { type: "number", value: 42 }, [simpleAlgorithm]);

      expect(result).toBeDefined();
      expect(result.algorithmId).toBe("simple");
      expect(result.algorithmName).toBe("SimpleAlgorithm");
      expect(result.algorithmDescription).toBe("A simple test algorithm");
      expect(result.success).toBe(true);
      expect(result.steps.length).toBe(2);
    });

    it("should include section and url in trace result", () => {
      const algorithmWithMeta: AlgorithmSpec = {
        ...simpleAlgorithm,
        section: "7.1.4",
        url: "https://262.ecma-international.org/#sec-tonumber",
      };

      const result = AbstractOperationTracer.trace(algorithmWithMeta, { type: "number", value: 42 }, [
        algorithmWithMeta,
      ]);

      expect(result.algorithmSection).toBe("7.1.4");
      expect(result.algorithmUrl).toBe("https://262.ecma-international.org/#sec-tonumber");
    });

    it("should include input in trace result", () => {
      const input = { type: "string", value: "test" };
      const result = AbstractOperationTracer.trace(simpleAlgorithm, input, [simpleAlgorithm]);

      expect(result.input).toEqual(input);
    });
  });

  describe("processSteps()", () => {
    it("should process all steps", () => {
      const result = AbstractOperationTracer.trace(simpleAlgorithm, "input", [simpleAlgorithm]);

      expect(result.steps.length).toBe(2);
      expect(result.steps[0].kind).toBe("assignment");
      expect(result.steps[1].kind).toBe("return");
    });

    it("should mark all steps as executed by default", () => {
      const result = AbstractOperationTracer.trace(simpleAlgorithm, "input", [simpleAlgorithm]);

      result.steps.forEach((step) => {
        expect(step.executed).toBe(true);
      });
    });

    it("should preserve number, letter, and roman identifiers", () => {
      const result = AbstractOperationTracer.trace(algorithmWithSubSteps, "input", [algorithmWithSubSteps]);

      expect(result.steps[0].number).toBe(1);
      expect(result.steps[0].subSteps?.[0].letter).toBe("a");
      expect(result.steps[0].subSteps?.[1].letter).toBe("b");
    });
  });

  describe("processStep() with substeps", () => {
    it("should recursively process substeps", () => {
      const result = AbstractOperationTracer.trace(algorithmWithSubSteps, "input", [algorithmWithSubSteps]);

      const mainStep = result.steps[0];
      expect(mainStep.subSteps).toBeDefined();
      expect(mainStep.subSteps?.length).toBe(2);
      expect(mainStep.subSteps?.[0].description).toContain("Let y be 100");
    });

    it("should preserve structure of nested substeps", () => {
      const result = AbstractOperationTracer.trace(algorithmWithSubSteps, "input", [algorithmWithSubSteps]);

      const mainStep = result.steps[0];
      expect(mainStep.subSteps?.[0].kind).toBe("assignment");
      expect(mainStep.subSteps?.[1].kind).toBe("return");
    });
  });

  describe("parseAlgorithmCall()", () => {
    it("should detect algorithm calls in step descriptions", () => {
      const result = AbstractOperationTracer.trace(algorithmWithCall, "input", [simpleAlgorithm, algorithmWithCall]);

      const firstStep = result.steps[0];
      expect(firstStep.nestedTrace).toBeDefined();
    });

    it("should handle algorithm calls with complex arguments", () => {
      const algorithmWithComplexCall: AlgorithmSpec = {
        id: "complex",
        name: "ComplexCall",
        description: "Complex call",
        steps: [
          {
            number: 1,
            kind: "assignment",
            description: "Let result be ? SimpleAlgorithm(argument, NUMBER).",
          },
        ],
      };

      const result = AbstractOperationTracer.trace(algorithmWithComplexCall, "input", [
        simpleAlgorithm,
        algorithmWithComplexCall,
      ]);

      const step = result.steps[0];
      expect(step.nestedTrace).toBeDefined();
      expect(step.nestedTrace?.algorithmName).toBe("SimpleAlgorithm");
    });

    it("should handle steps without algorithm calls", () => {
      const result = AbstractOperationTracer.trace(simpleAlgorithm, "input", [simpleAlgorithm]);

      result.steps.forEach((step) => {
        expect(step.nestedTrace).toBeUndefined();
      });
    });
  });

  describe("findAlgorithmByName()", () => {
    it("should find algorithm by exact name", () => {
      const result = AbstractOperationTracer.trace(algorithmWithCall, "input", [simpleAlgorithm, algorithmWithCall]);

      const firstStep = result.steps[0];
      expect(firstStep.nestedTrace?.algorithmName).toBe("SimpleAlgorithm");
    });

    it("should handle case-sensitive algorithm names", () => {
      const wrongCaseAlgorithm: AlgorithmSpec = {
        id: "wrongCase",
        name: "WrongCaseCall",
        description: "Test",
        steps: [
          {
            number: 1,
            kind: "assignment",
            description: "Let result be ? simpAlgorithm(input).",
          },
        ],
      };

      // Should not find algorithm with wrong case
      const result = AbstractOperationTracer.trace(wrongCaseAlgorithm, "input", [simpleAlgorithm, wrongCaseAlgorithm]);

      const step = result.steps[0];
      expect(step.nestedTrace).toBeUndefined();
    });
  });

  describe("recursive tracing", () => {
    it("should trace recursive algorithm calls", () => {
      const callChainAlgorithm: AlgorithmSpec = {
        id: "chain",
        name: "ChainCall",
        description: "Call chain",
        steps: [
          {
            number: 1,
            kind: "assignment",
            description: "Let a be ? AlgorithmWithCall(input).",
          },
        ],
      };

      const result = AbstractOperationTracer.trace(callChainAlgorithm, "input", [
        simpleAlgorithm,
        algorithmWithCall,
        callChainAlgorithm,
      ]);

      const step = result.steps[0];
      expect(step.nestedTrace).toBeDefined();
      expect(step.nestedTrace?.algorithmName).toBe("AlgorithmWithCall");
      expect(step.nestedTrace?.steps[0].nestedTrace).toBeDefined();
      expect(step.nestedTrace?.steps[0].nestedTrace?.algorithmName).toBe("SimpleAlgorithm");
    });

    it("should handle deep nesting of algorithm calls", () => {
      const deepAlgorithm: AlgorithmSpec = {
        id: "deep",
        name: "DeepAlgorithm",
        description: "Deep test",
        steps: [
          {
            number: 1,
            kind: "conditional",
            description: "If true, then",
            subSteps: [
              {
                letter: "a",
                kind: "assignment",
                description: "Let result be ? SimpleAlgorithm(input).",
              },
            ],
          },
        ],
      };

      const result = AbstractOperationTracer.trace(deepAlgorithm, "input", [simpleAlgorithm, deepAlgorithm]);

      const subStep = result.steps[0].subSteps?.[0];
      expect(subStep?.nestedTrace).toBeDefined();
      expect(subStep?.nestedTrace?.algorithmName).toBe("SimpleAlgorithm");
    });
  });

  describe("step properties", () => {
    it("should preserve kind property", () => {
      const result = AbstractOperationTracer.trace(simpleAlgorithm, "input", [simpleAlgorithm]);

      expect(result.steps[0].kind).toBe("assignment");
      expect(result.steps[1].kind).toBe("return");
    });

    it("should preserve description property", () => {
      const result = AbstractOperationTracer.trace(simpleAlgorithm, "input", [simpleAlgorithm]);

      expect(result.steps[0].description).toBe("Let x be 42.");
      expect(result.steps[1].description).toBe("Return x.");
    });

    it("should have executed property set to true", () => {
      const result = AbstractOperationTracer.trace(simpleAlgorithm, "input", [simpleAlgorithm]);

      result.steps.forEach((step) => {
        expect(typeof step.executed).toBe("boolean");
        expect(step.executed).toBe(true);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle algorithm with no steps", () => {
      const emptyAlgorithm: AlgorithmSpec = {
        id: "empty",
        name: "EmptyAlgorithm",
        description: "Empty algorithm",
        steps: [],
      };

      const result = AbstractOperationTracer.trace(emptyAlgorithm, "input", [emptyAlgorithm]);

      expect(result.steps.length).toBe(0);
      expect(result.success).toBe(true);
    });

    it("should handle algorithm with deeply nested substeps", () => {
      const deepNestedAlgorithm: AlgorithmSpec = {
        id: "deepNested",
        name: "DeepNestedAlgorithm",
        description: "Deep nested",
        steps: [
          {
            number: 1,
            kind: "conditional",
            description: "If a, then",
            subSteps: [
              {
                letter: "a",
                kind: "conditional",
                description: "If b, then",
                subSteps: [
                  {
                    letter: "i",
                    kind: "return",
                    description: "Return value.",
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = AbstractOperationTracer.trace(deepNestedAlgorithm, "input", [deepNestedAlgorithm]);

      expect(result.steps[0].subSteps?.[0].subSteps?.[0].kind).toBe("return");
    });

    it("should stop nested execution after return in substeps", () => {
      const mixedAlgorithm: AlgorithmSpec = {
        id: "mixed",
        name: "MixedAlgorithm",
        description: "Mixed identifiers",
        steps: [
          {
            number: 1,
            kind: "conditional",
            description: "If condition, then",
            subSteps: [
              {
                letter: "a",
                kind: "conditional",
                description: "If nested, then",
                subSteps: [
                  {
                    roman: "i",
                    kind: "return",
                    description: "Return.",
                  },
                  {
                    roman: "ii",
                    kind: "assignment",
                    description: "Let x be 1.",
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = AbstractOperationTracer.trace(mixedAlgorithm, "input", [mixedAlgorithm]);

      const romanStep1 = result.steps[0].subSteps?.[0].subSteps?.[0];
      const romanStep2 = result.steps[0].subSteps?.[0].subSteps?.[1];

      expect(romanStep1?.roman).toBe("i");
      expect(romanStep2).toBeUndefined();
    });
  });
});
