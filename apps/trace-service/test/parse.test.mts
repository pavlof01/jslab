/**
 * Operator detection decides where a `/execute/equality` expression is split
 * and which spec algorithm runs, so it is worth pinning on its own — the
 * end-to-end behaviour lives in execute.test.mts.
 */
import { describe, expect, it } from "vitest";

import { detectOperator } from "../src/server/execute/parse.ts";
import {
  AVAILABLE_FUNCTIONS,
  FUNCTION_META,
  SUPPORTED_OPERATORS,
} from "../src/server/operations.ts";

describe("SUPPORTED_OPERATORS", () => {
  it("lists every operator before any operator that is a prefix of it", () => {
    // "===" must be tried before "==", and "<=" before "<".
    for (const [i, op] of SUPPORTED_OPERATORS.entries()) {
      for (const later of SUPPORTED_OPERATORS.slice(i + 1)) {
        expect(
          op.startsWith(later) || !later.startsWith(op),
          `${later} must come before ${op}`,
        ).toBe(true);
      }
    }
  });
});

describe("detectOperator", () => {
  it.each(SUPPORTED_OPERATORS)("finds %s in a simple expression", (op) => {
    expect(detectOperator(`1 ${op} 2`)).toEqual({ operator: op, index: 2 });
  });

  it("prefers the longest operator at a position", () => {
    expect(detectOperator("1 === 2")?.operator).toBe("===");
    expect(detectOperator("1 !== 2")?.operator).toBe("!==");
    expect(detectOperator("1 <= 2")?.operator).toBe("<=");
    expect(detectOperator("1 >= 2")?.operator).toBe(">=");
  });

  it("splits on the loosest-binding tier, not on the leftmost operator", () => {
    const input = "1 < 2 == true";
    const found = detectOperator(input)!;
    expect(found.operator).toBe("==");
    expect(input.slice(0, found.index).trim()).toBe("1 < 2");
  });

  it("splits a chain on its last operator, because these are left-associative", () => {
    const chain = '"a" + 1 + 2';
    const additive = detectOperator(chain)!;
    expect(additive.operator).toBe("+");
    expect(chain.slice(0, additive.index).trim()).toBe('"a" + 1');
    expect(chain.slice(additive.index + 1).trim()).toBe("2");

    const equalities = "1 == 1 == true";
    const found = detectOperator(equalities)!;
    expect(equalities.slice(0, found.index).trim()).toBe("1 == 1");
  });

  it("keeps the + of an exponent out of the split", () => {
    expect(detectOperator("1e+5")).toBeNull();
    const input = "1e+5 + 1";
    const found = detectOperator(input)!;
    expect(input.slice(0, found.index).trim()).toBe("1e+5");
    expect(detectOperator("x1e + 5")?.index).toBe(4);
  });

  it("treats a + after a word-shaped unary operator as unary", () => {
    expect(detectOperator("typeof +1")).toBeNull();
    expect(detectOperator("void +1")).toBeNull();
    const input = 'typeof {} + "!"';
    expect(input.slice(0, detectOperator(input)!.index).trim()).toBe("typeof {}");
  });

  it("ignores an operator inside a regex literal", () => {
    expect(detectOperator("/a+b/")).toBeNull();
    const input = '/a+b/.source + "!"';
    expect(input.slice(0, detectOperator(input)!.index).trim()).toBe("/a+b/.source");
  });

  it("scans a long expression without a top-level operator in linear time", () => {
    const long = "f(" + "a + ".repeat(5_000) + "b)";
    const started = performance.now();
    expect(detectOperator(long)).toBeNull();
    expect(performance.now() - started).toBeLessThan(50);
  });

  it("reports an index the caller can split the operands on", () => {
    const input = "{} == ![]";
    const found = detectOperator(input)!;
    expect(input.slice(0, found.index).trim()).toBe("{}");
    expect(input.slice(found.index + found.operator.length).trim()).toBe("![]");
  });

  it("ignores an operator inside a string literal", () => {
    expect(detectOperator('"a == b"')).toBeNull();
    expect(detectOperator("'a == b'")).toBeNull();
    expect(detectOperator("`a == b`")).toBeNull();
  });

  it("does not end a string on an escaped quote", () => {
    expect(detectOperator('"a \\" == b"')).toBeNull();
  });

  it("finds an operator that follows a string containing one", () => {
    expect(detectOperator('"a == b" === x')?.operator).toBe("===");
  });

  it("ignores an operator nested inside brackets or braces", () => {
    expect(detectOperator("[1 == 2]")).toBeNull();
    expect(detectOperator("({ a: 1 < 2 })")).toBeNull();
  });

  it("finds the top-level operator after a nested expression", () => {
    const input = "{ valueOf: () => 1 } == 1";
    const found = detectOperator(input)!;
    expect(found.operator).toBe("==");
    expect(input.slice(0, found.index).trim()).toBe("{ valueOf: () => 1 }");
  });

  it("does not mistake an arrow function for a relational operator", () => {
    expect(detectOperator("() => 1")).toBeNull();
    expect(detectOperator("x => x")).toBeNull();
  });

  it("returns null when there is no operator at all", () => {
    expect(detectOperator("42")).toBeNull();
    expect(detectOperator("")).toBeNull();
  });
});

describe("function catalog", () => {
  it("describes every function it offers", () => {
    for (const name of AVAILABLE_FUNCTIONS) {
      expect(FUNCTION_META[name], `${name} has no metadata`).toBeDefined();
    }
  });

  it("offers only unary type-conversion operations on that endpoint", () => {
    for (const name of AVAILABLE_FUNCTIONS) {
      expect(FUNCTION_META[name].category).toBe("typeConversion");
      expect(FUNCTION_META[name].arity).toBe("unary");
    }
  });

  it("lists no duplicates", () => {
    expect(new Set(AVAILABLE_FUNCTIONS).size).toBe(AVAILABLE_FUNCTIONS.length);
  });
});
