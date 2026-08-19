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
import {
  AVAILABLE_FUNCTIONS,
  BINARY_ALGORITHMS,
  FUNCTION_ALGOS,
  FUNCTION_META,
  SUPPORTED_OPERATORS,
  SUPPORTED_SPEC_FUNCTIONS,
  UNARY_OPERATIONS,
  callUnaryOperation,
  getOperatorDispatch,
} from "../src/server/operations.ts";
import { executeBinaryExpression, executeUnaryConversion } from "../src/server/execute/index.ts";

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

  it("reports the algorithm an expression actually reached", async () => {
    const result = await executeBinaryExpression("{} == ![]");
    expect(result.success).toBe(true);
    expect(result.detectedOperator).toBe("==");
    expect(result.effectiveAlgoId).toBe("IsLooselyEqual");
    expect(result.root).toBeDefined();
  });

  it("explains an expression with no operator instead of throwing", async () => {
    const result = await executeBinaryExpression("1 + 1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Expected a binary expression");
  });
});
