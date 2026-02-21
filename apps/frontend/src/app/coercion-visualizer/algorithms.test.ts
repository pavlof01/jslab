import { describe, it, expect } from "@jest/globals";
import {
  getAllAlgorithms,
  getAlgorithmById,
  getAlgorithmByName,
  ToNumberAlgorithm,
  StringToNumberAlgorithm,
  ToPrimitiveAlgorithm,
  OrdinaryToPrimitiveAlgorithm,
  IsCallableAlgorithm,
} from "./algorithms";

describe("Algorithm Classes", () => {
  describe("ToNumberAlgorithm", () => {
    it("should return AlgorithmSpec with correct id and name", () => {
      const spec = ToNumberAlgorithm.getSpec();

      expect(spec.id).toBe("toNumber");
      expect(spec.name).toBe("ToNumber");
    });

    it("should have section and url", () => {
      const spec = ToNumberAlgorithm.getSpec();

      expect(spec.section).toBe("7.1.4");
      expect(spec.url).toBe("https://262.ecma-international.org/#sec-tonumber");
    });

    it("should have 10 steps", () => {
      const spec = ToNumberAlgorithm.getSpec();

      expect(spec.steps.length).toBe(10);
    });

    it("should have numbered steps", () => {
      const spec = ToNumberAlgorithm.getSpec();

      spec.steps.forEach((step, index) => {
        expect(step.number).toBe(index + 1);
      });
    });

    it("should have kinds that match step types", () => {
      const spec = ToNumberAlgorithm.getSpec();

      expect(spec.steps[0].kind).toBe("return");
      expect(spec.steps[1].kind).toBe("throw");
      expect(spec.steps[6].kind).toBe("assertion");
      expect(spec.steps[7].kind).toBe("assignment");
    });

    it("should have description property", () => {
      const spec = ToNumberAlgorithm.getSpec();

      expect(spec.description).toBeDefined();
      expect(spec.description.length).toBeGreaterThan(0);
    });
  });

  describe("StringToNumberAlgorithm", () => {
    it("should return AlgorithmSpec with correct id and name", () => {
      const spec = StringToNumberAlgorithm.getSpec();

      expect(spec.id).toBe("stringToNumber");
      expect(spec.name).toBe("StringToNumber");
    });

    it("should have section and url", () => {
      const spec = StringToNumberAlgorithm.getSpec();

      expect(spec.section).toBe("7.1.4.1.1");
      expect(spec.url).toBe("https://262.ecma-international.org/#sec-stringtonumber");
    });

    it("should have 3 steps", () => {
      const spec = StringToNumberAlgorithm.getSpec();

      expect(spec.steps.length).toBe(3);
    });

    it("should be called from ToNumber step 6", () => {
      const toNumberSpec = ToNumberAlgorithm.getSpec();
      const step6 = toNumberSpec.steps[5]; // 0-indexed

      expect(step6.description).toContain("StringToNumber");
    });

    it('execute("42") should return 42', () => {
      expect(StringToNumberAlgorithm.execute("42")).toBe(42);
    });

    it('execute("  123  ") should return 123', () => {
      expect(StringToNumberAlgorithm.execute("  123  ")).toBe(123);
    });

    it('execute("") should return 0', () => {
      expect(StringToNumberAlgorithm.execute("")).toBe(0);
    });

    it('execute("hello") should return NaN', () => {
      const result = StringToNumberAlgorithm.execute("hello");
      expect(Number.isNaN(result)).toBe(true);
    });

    it("executeWithTrace should include step 2 for invalid literal", () => {
      const trace = StringToNumberAlgorithm.executeWithTrace("12abc");

      expect(trace.steps.map((s) => s.number)).toEqual([1, 2]);
      expect(trace.runtimeSteps).toEqual([
        {
          operation: "Number(str)",
          description: "Runtime execution in JS/V8 model: Number(str).",
          result: NaN,
        },
      ]);
      expect(trace.literal).toBeNull();
      expect(Number.isNaN(trace.value)).toBe(true);
      expect(Number.isNaN(trace.scriptResult)).toBe(true);
      expect(trace.specSteps.map((step) => step.number)).toEqual([1, 2, 3]);
    });

    it("executeWithTrace should include step 3 for valid literal", () => {
      const trace = StringToNumberAlgorithm.executeWithTrace("1e2");

      expect(trace.steps.map((s) => s.number)).toEqual([1, 3]);
      expect(trace.literal).toBe(100);
      expect(trace.value).toBe(100);
      expect(trace.scriptResult).toBe(100);
      expect(trace.runtimeSteps).toEqual([
        {
          operation: "Number(str)",
          description: "Runtime execution in JS/V8 model: Number(str).",
          result: 100,
        },
      ]);
      expect(trace.specSteps.map((step) => step.description)).toEqual([
        "Let literal be ParseText(str, StringNumericLiteral).",
        "If literal is a List of errors, return NaN.",
        "Return the StringNumericValue of literal.",
      ]);
    });
  });

  describe("IsCallableAlgorithm", () => {
    it("should return AlgorithmSpec with correct id and name", () => {
      const spec = IsCallableAlgorithm.getSpec();

      expect(spec.id).toBe("isCallable");
      expect(spec.name).toBe("IsCallable");
    });

    it("should have 3 steps", () => {
      const spec = IsCallableAlgorithm.getSpec();

      expect(spec.steps.length).toBe(3);
    });

    it("should all be return statements", () => {
      const spec = IsCallableAlgorithm.getSpec();

      spec.steps.forEach((step) => {
        expect(step.kind).toBe("return");
      });
    });
  });

  describe("ToPrimitiveAlgorithm", () => {
    it("should return AlgorithmSpec with correct id and name", () => {
      const spec = ToPrimitiveAlgorithm.getSpec();

      expect(spec.id).toBe("toPrimitive");
      expect(spec.name).toBe("ToPrimitive");
    });

    it("should have nested substeps", () => {
      const spec = ToPrimitiveAlgorithm.getSpec();

      expect(spec.steps[0].subSteps).toBeDefined();
      expect(spec.steps[0].subSteps?.length).toBeGreaterThan(0);
    });

    it("should have proper nesting structure", () => {
      const spec = ToPrimitiveAlgorithm.getSpec();

      const step1 = spec.steps[0];
      expect(step1.number).toBe(1);
      expect(step1.kind).toBe("conditional");

      const substep1b = step1.subSteps?.find((s) => s.letter === "b");
      expect(substep1b).toBeDefined();
      expect(substep1b?.subSteps?.length).toBeGreaterThan(0);
    });
  });

  describe("OrdinaryToPrimitiveAlgorithm", () => {
    it("should return AlgorithmSpec with correct id and name", () => {
      const spec = OrdinaryToPrimitiveAlgorithm.getSpec();

      expect(spec.id).toBe("ordinaryToPrimitive");
      expect(spec.name).toBe("OrdinaryToPrimitive");
    });

    it("should have conditional steps", () => {
      const spec = OrdinaryToPrimitiveAlgorithm.getSpec();

      expect(spec.steps[0].kind).toBe("conditional");
      expect(spec.steps[1].kind).toBe("condition-else");
    });

    it("should have loop step", () => {
      const spec = OrdinaryToPrimitiveAlgorithm.getSpec();

      const loopStep = spec.steps.find((s) => s.kind === "loop");
      expect(loopStep).toBeDefined();
      expect(loopStep?.description).toContain("For each");
    });
  });

  describe("getAllAlgorithms()", () => {
    it("should return all 5 algorithms", () => {
      const algorithms = getAllAlgorithms();

      expect(algorithms.length).toBe(5);
    });

    it("should return algorithms in correct order", () => {
      const algorithms = getAllAlgorithms();

      expect(algorithms[0].id).toBe("toNumber");
      expect(algorithms[1].id).toBe("stringToNumber");
      expect(algorithms[2].id).toBe("toPrimitive");
      expect(algorithms[3].id).toBe("ordinaryToPrimitive");
      expect(algorithms[4].id).toBe("isCallable");
    });

    it("should return instances with valid specs", () => {
      const algorithms = getAllAlgorithms();

      algorithms.forEach((algo) => {
        expect(algo.id).toBeDefined();
        expect(algo.name).toBeDefined();
        expect(algo.description).toBeDefined();
        expect(Array.isArray(algo.steps)).toBe(true);
      });
    });
  });

  describe("getAlgorithmById()", () => {
    it("should find algorithm by id", () => {
      const algo = getAlgorithmById("toNumber");

      expect(algo).toBeDefined();
      expect(algo?.name).toBe("ToNumber");
    });

    it("should return undefined for unknown id", () => {
      const algo = getAlgorithmById("unknownId");

      expect(algo).toBeUndefined();
    });

    it("should find all available algorithms", () => {
      const ids = ["toNumber", "stringToNumber", "toPrimitive", "ordinaryToPrimitive", "isCallable"];

      ids.forEach((id) => {
        const algo = getAlgorithmById(id);
        expect(algo).toBeDefined();
        expect(algo?.id).toBe(id);
      });
    });
  });

  describe("getAlgorithmByName()", () => {
    it("should find algorithm by name", () => {
      const algo = getAlgorithmByName("ToNumber");

      expect(algo).toBeDefined();
      expect(algo?.id).toBe("toNumber");
    });

    it("should return undefined for unknown name", () => {
      const algo = getAlgorithmByName("UnknownAlgorithm");

      expect(algo).toBeUndefined();
    });

    it("should be case-sensitive", () => {
      const algoCorrect = getAlgorithmByName("ToNumber");
      const algoWrong = getAlgorithmByName("toNumber");

      expect(algoCorrect).toBeDefined();
      expect(algoWrong).toBeUndefined();
    });

    it("should find all available algorithms", () => {
      const names = ["ToNumber", "StringToNumber", "ToPrimitive", "OrdinaryToPrimitive", "IsCallable"];

      names.forEach((name) => {
        const algo = getAlgorithmByName(name);
        expect(algo).toBeDefined();
        expect(algo?.name).toBe(name);
      });
    });
  });

  describe("Algorithm step kinds", () => {
    it("should use valid step kinds", () => {
      const validKinds = ["return", "throw", "assertion", "assignment", "conditional", "condition-else", "loop"];
      const algorithms = getAllAlgorithms();

      const collectKinds = (steps: any[]): string[] => {
        const kinds: string[] = [];
        steps.forEach((step) => {
          kinds.push(step.kind);
          if (step.subSteps) {
            kinds.push(...collectKinds(step.subSteps));
          }
        });
        return kinds;
      };

      algorithms.forEach((algo) => {
        const kinds = collectKinds(algo.steps);
        kinds.forEach((kind) => {
          expect(validKinds).toContain(kind);
        });
      });
    });
  });

  describe("Algorithm cross-references", () => {
    it("should reference StringToNumber from ToNumber", () => {
      const toNumber = ToNumberAlgorithm.getSpec();
      const step6 = toNumber.steps[5]; // 0-indexed

      expect(step6.description).toContain("StringToNumber");
    });

    it("should reference OrdinaryToPrimitive from ToPrimitive", () => {
      const toPrimitive = ToPrimitiveAlgorithm.getSpec();
      const step1 = toPrimitive.steps[0];
      const substepD = step1.subSteps?.find((s) => s.letter === "d");

      expect(substepD?.description).toContain("OrdinaryToPrimitive");
    });

    it("should reference IsCallable from OrdinaryToPrimitive", () => {
      const ordinaryToPrimitive = OrdinaryToPrimitiveAlgorithm.getSpec();
      const step3 = ordinaryToPrimitive.steps[2];
      const substepB = step3.subSteps?.find((s) => s.letter === "b");

      expect(substepB?.description).toContain("IsCallable");
    });
  });
});
