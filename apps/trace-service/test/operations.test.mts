/**
 * The registry's invariants.
 *
 * These used to be four separate lists — advertised functions, metadata,
 * dispatch, spec clauses — kept in step by hand, and they drifted: eleven
 * operations were executable but unreachable, because the advertised list (from
 * which the request schema's enum is built) never learned about them. Now that
 * everything is derived from one table, the tests below are what stop it
 * drifting again.
 */
import { describe, expect, it } from "vitest";
import { executeBinaryExpression, executeUnaryConversion } from "../src/server/execute/index.ts";
import {
  AVAILABLE_FUNCTIONS,
  BINARY_ALGORITHMS,
  callUnaryOperation,
  FUNCTION_ALGOS,
  FUNCTION_META,
  getOperatorDispatch,
  SUPPORTED_OPERATORS,
  SUPPORTED_SPEC_FUNCTIONS,
  UNARY_OPERATIONS,
} from "../src/server/operations.ts";

function findStep(
  node: { steps?: Array<{ algoId?: string; specUrl?: string }> } | undefined,
  predicate: (step: { algoId?: string; specUrl?: string }) => boolean,
): { algoId?: string; specUrl?: string } | undefined {
  for (const step of node?.steps ?? []) {
    if (predicate(step)) return step;
    const nested = findStep(
      step as { steps?: Array<{ algoId?: string; specUrl?: string }> },
      predicate,
    );
    if (nested) return nested;
  }
  return undefined;
}

describe("operations registry", () => {
  it("advertises exactly the operations it can dispatch", () => {
    expect(AVAILABLE_FUNCTIONS).toEqual(Object.keys(UNARY_OPERATIONS));
    expect(Object.keys(FUNCTION_META)).toEqual(AVAILABLE_FUNCTIONS);
  });

  it("gives every advertised operation a spec panel to show", () => {
    for (const name of AVAILABLE_FUNCTIONS) {
      expect(FUNCTION_ALGOS[name]?.length, `${name} has no spec clauses`).toBeGreaterThan(0);
      // The clause list has to start with the operation's own clause, or the
      // panel opens on someone else's algorithm.
      expect(FUNCTION_ALGOS[name][0]).toBe(name);
    }
  });

  it("serves a spec panel for the binary entry points too", () => {
    for (const name of [...Object.keys(BINARY_ALGORITHMS), "BinaryExpression"]) {
      expect(SUPPORTED_SPEC_FUNCTIONS).toContain(name);
    }
  });

  it("dispatches every supported operator", () => {
    for (const operator of SUPPORTED_OPERATORS) {
      const dispatch = getOperatorDispatch(operator);
      expect(BINARY_ALGORITHMS[dispatch.algoName]).toBeDefined();
    }
  });

  it("refuses an operation it does not know", () => {
    expect(() => callUnaryOperation("ToWhatever", null as never)).toThrow(/Unknown function/);
  });
});

describe("execute", () => {
  it("traces a unary conversion end to end", async () => {
    const result = await executeUnaryConversion("ToNumber", "'42'");
    expect(result.success).toBe(true);
    expect(result.functionName).toBe("ToNumber");
    expect(result.result).toMatchObject({ type: "Number", value: 42 });
    expect(result.root).toBeDefined();
  });

  it.each([
    ["ToNumber", "'42'", { type: "Number", value: 42 }],
    ["ToNumeric", "10n", { type: "BigInt", value: "10" }],
    ["ToString", "123", { type: "String", value: "123" }],
    ["ToBoolean", "''", { type: "Boolean", value: false }],
    ["ToPrimitive", "{ valueOf: () => 7 }", { type: "Number", value: 7 }],
    ["ToObject", "'hi'", { type: "Object" }],
    ["ToPropertyKey", "2", { type: "String", value: "2" }],
    ["ToLength", "-5", { type: "Number", value: 0 }],
  ])("executes %s through engine262 end to end", async (fn, input, expected) => {
    const result = await executeUnaryConversion(fn, input);
    expect(result.success, `${fn}(${input}) failed: ${result.error}`).toBe(true);
    expect(result.functionName).toBe(fn);
    expect(result.result).toMatchObject(expected);
    expect(result.root, `${fn} produced no trace tree`).toBeDefined();
  });

  it("executes ToIndex, whose spec return is a mathematical value, not a language value", async () => {
    const result = await executeUnaryConversion("ToIndex", "3");
    expect(result.success, result.error).toBe(true);
    expect(result.functionName).toBe("ToIndex");
    expect(JSON.stringify(result.root)).toContain("Valid index: 3");
  });

  it("reports the algorithm an expression actually reached", async () => {
    const result = await executeBinaryExpression("{} == ![]");
    expect(result.success).toBe(true);
    expect(result.detectedOperator).toBe("==");
    expect(result.effectiveAlgoId).toBe("IsLooselyEqual");
    expect(result.root).toBeDefined();
  });

  it("explains an expression with no operator instead of throwing", async () => {
    const result = await executeBinaryExpression("42");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Expected a binary expression");
    for (const operator of SUPPORTED_OPERATORS) expect(result.error).toContain(operator);
  });

  it("traces the concatenation branch of +", async () => {
    const result = await executeBinaryExpression("[] + {}");
    expect(result.success).toBe(true);
    expect(result.detectedOperator).toBe("+");
    expect(result.effectiveAlgoId).toBe("ApplyStringOrNumericBinaryOperator");
    expect(result.result).toMatchObject({ type: "String", value: "[object Object]" });
    expect(JSON.stringify(result.root)).toContain("ApplyStringOrNumericBinaryOperator");
  });

  it("adds when neither side becomes a String", async () => {
    const result = await executeBinaryExpression("1 + true");
    expect(result.success).toBe(true);
    expect(result.result).toMatchObject({ type: "Number", value: 2 });
  });

  it("traces a chain the way JavaScript associates it", async () => {
    const result = await executeBinaryExpression('"a" + 1 + 2');
    expect(result.success).toBe(true);
    expect(result.result).toMatchObject({ type: "String", value: "a12" });

    const numericFirst = await executeBinaryExpression('1 + 2 + "3"');
    expect(numericFirst.result).toMatchObject({ type: "String", value: "33" });
  });

  it("gives the BigInt branch a frame of its own", async () => {
    const result = await executeBinaryExpression("1n + 2n");
    expect(result.success).toBe(true);
    expect(result.result).toMatchObject({ type: "BigInt", value: "3" });
    const bigIntStep = findStep(result.root, (step) => step.algoId === "BigInt::add");
    expect(bigIntStep, "no BigInt::add frame in the trace").toBeDefined();
    expect(bigIntStep?.specUrl).toBeDefined();
  });

  it("refuses to mix BigInt and Number, at the step that says so", async () => {
    const result = await executeBinaryExpression("1n + 1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("BigInt");
  });

  it("does not leak one expression's trace into the next through a shared literal", async () => {
    const failed = await executeBinaryExpression("true + Symbol()");
    expect(failed.success).toBe(false);

    const next = await executeBinaryExpression("true == 1");
    expect(next.success).toBe(true);
    expect(next.root?.algoId).toBe("IsLooselyEqual");
    expect(JSON.stringify(next.root)).not.toContain("ApplyStringOrNumericBinaryOperator");
  });

  it("splits on the comparison, not on the + that binds tighter", async () => {
    const result = await executeBinaryExpression("1 + 2 == 3");
    expect(result.success).toBe(true);
    expect(result.detectedOperator).toBe("==");
    expect(result.result).toMatchObject({ type: "Boolean", value: true });
  });

  it("does not split on a unary +", async () => {
    const result = await executeBinaryExpression("+1 == 1");
    expect(result.success).toBe(true);
    expect(result.detectedOperator).toBe("==");
  });
});
