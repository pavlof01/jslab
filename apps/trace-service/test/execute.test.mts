/**
 * End-to-end spec-tracing tests against the REAL worker: operator detection,
 * algorithm dispatch, engine262 execution, and result serialization all run
 * together, exactly as a `/execute/*` request does.
 *
 * engine262 cannot be imported into this thread (it is why the sandbox exists —
 * see sandbox.test.mts), so the sandbox is the unit under test's only door. One
 * sandbox is shared by the whole file: the cold engine262 import is the
 * expensive part, and it is paid once.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildTraceApp } from "../src/server/app.ts";
import { TraceSandbox } from "../src/server/execute/sandbox.ts";
import type { ExecuteResponse } from "../src/server/types.ts";

let sandbox: TraceSandbox;

beforeAll(async () => {
  sandbox = new TraceSandbox({ budgetMs: 30_000 });
  // Warm the worker so the first real assertion is not billed for the import.
  await sandbox.run({ kind: "unary", functionName: "ToString", input: "1" });
}, 60_000);

afterAll(async () => {
  await sandbox?.close();
});

const convert = (functionName: string, input: string, preferredType?: "string" | "number"): Promise<ExecuteResponse> =>
  sandbox.run({ kind: "unary", functionName, input, preferredType });

const compare = (input: string): Promise<ExecuteResponse> => sandbox.run({ kind: "binary", input });

describe("type conversion", () => {
  it.each([
    ["ToNumber", "'42'", { type: "Number", value: 42 }],
    ["ToNumber", "true", { type: "Number", value: 1 }],
    ["ToNumber", "null", { type: "Number", value: 0 }],
    ["ToString", "42", { type: "String", value: "42" }],
    ["ToString", "null", { type: "String", value: "null" }],
    ["ToBoolean", "0", { type: "Boolean", value: false }],
    ["ToBoolean", "'a'", { type: "Boolean", value: true }],
    ["ToLength", "-5", { type: "Number", value: 0 }],
  ])("%s(%s) follows the spec", async (fn, input, expected) => {
    const response = await convert(fn, input);
    expect(response.success).toBe(true);
    expect(response.result).toEqual(expected);
  });

  it("reports NaN as a Number, not as a parse failure", async () => {
    const response = await convert("ToNumber", "'not a number'");
    expect(response.success).toBe(true);
    expect(response.result).toMatchObject({ type: "Number" });
    expect(String((response.result as { value: unknown }).value)).toBe("NaN");
  });

  it("walks into a user-supplied valueOf and records the steps", async () => {
    const response = await convert("ToNumber", "{ valueOf: () => '1' }");

    expect(response.success).toBe(true);
    expect(response.result).toEqual({ type: "Number", value: 1 });
    // The trace is the product: ToNumber must be shown reaching ToPrimitive.
    expect(response.root?.algoId).toBeTruthy();
    const serialized = JSON.stringify(response.root);
    expect(serialized).toContain("ToPrimitive");
    expect(serialized).toContain("ToNumber");
  });

  it("honours the preferredType hint on ToPrimitive", async () => {
    const asString = await convert("ToPrimitive", "{ valueOf: () => 1, toString: () => 'one' }", "string");
    expect(asString.result).toEqual({ type: "String", value: "one" });

    const asNumber = await convert("ToPrimitive", "{ valueOf: () => 1, toString: () => 'one' }", "number");
    expect(asNumber.result).toEqual({ type: "Number", value: 1 });
  });

  it("names the error type when a conversion throws", async () => {
    // ToNumber(Symbol) is a spec TypeError, and the message has to say so —
    // the engine262 value stringifies to "[object Object]" on its own.
    const response = await convert("ToNumber", "Symbol('x')");
    expect(response.success).toBe(false);
    expect(response.error).toContain("TypeError");
    expect(response.error).toContain("Symbol");
    expect(response.error).not.toContain("[object Object]");
  });

  it("carries a user-thrown error's own message", async () => {
    const response = await convert("ToNumber", "({ valueOf: () => { throw new TypeError('custom'); } })");
    expect(response.success).toBe(false);
    expect(response.error).toContain("TypeError: custom");
  });

  it("answers a parse failure as a failed trace, not an exception", async () => {
    // A snippet that does not parse is the caller's mistake: it has to come
    // back as { success: false } so the route answers 400 rather than 500.
    const response = await convert("ToNumber", "this is not javascript");
    expect(response.success).toBe(false);
    expect(response.error).toContain('Failed to parse input "this is not javascript"');
    expect(response.error).toContain("SyntaxError");
  });

  it("answers an unknown abstract operation as a failed trace", async () => {
    const response = await convert("ToWhatever", "1");
    expect(response.success).toBe(false);
    expect(response.error).toBe("Unknown function: ToWhatever");
  });
});

describe("equality and relational operators", () => {
  it.each([
    ["1 == 1", true, "IsLooselyEqual"],
    ["1 == 2", false, "IsLooselyEqual"],
    ["'1' == 1", true, "IsLooselyEqual"],
    ["1 === 1", true, "IsStrictlyEqual"],
    ["'1' === 1", false, "IsStrictlyEqual"],
    ["1 != 2", true, "IsLooselyEqual"],
    ["1 !== 1", false, "IsStrictlyEqual"],
    ["1 < 2", true, "AbstractRelationalComparison"],
    ["2 < 1", false, "AbstractRelationalComparison"],
    ["2 > 1", true, "AbstractRelationalComparison"],
    ["1 <= 1", true, "AbstractRelationalComparison"],
    ["1 >= 2", false, "AbstractRelationalComparison"],
  ])("evaluates %s", async (input, expected, algo) => {
    const response = await compare(input);
    expect(response.success).toBe(true);
    expect(response.result).toEqual({ type: "Boolean", value: expected });
    expect(response.effectiveAlgoId).toBe(algo);
  });

  it("reports the operator it detected", async () => {
    expect((await compare("1 === 1")).detectedOperator).toBe("===");
    expect((await compare("1 <= 2")).detectedOperator).toBe("<=");
  });

  it("gets the famously surprising cases right", async () => {
    // These are the expressions the equality page exists to explain.
    expect((await compare("[] == ![]")).result).toEqual({ type: "Boolean", value: true });
    expect((await compare("null == undefined")).result).toEqual({ type: "Boolean", value: true });
    expect((await compare("null === undefined")).result).toEqual({ type: "Boolean", value: false });
    expect((await compare("'' == 0")).result).toEqual({ type: "Boolean", value: true });
  });

  it("treats a NaN comparison as false for every relational operator", async () => {
    // AbstractRelationalComparison returns undefined; each operator maps it to false.
    for (const input of ["NaN < 1", "NaN > 1", "NaN <= 1", "NaN >= 1"]) {
      expect((await compare(input)).result, input).toEqual({ type: "Boolean", value: false });
    }
  });

  it("captures the sub-algorithms an equality comparison went through", async () => {
    const response = await compare("'1' == 1");
    expect(response.success).toBe(true);
    expect(JSON.stringify(response.root)).toContain("IsLooselyEqual");
  });

  it("rejects an expression with no operator", async () => {
    const response = await compare("42");
    expect(response.success).toBe(false);
    expect(response.error).toMatch(/Expected a binary expression/);
  });

  it("rejects an expression missing an operand", async () => {
    for (const input of ["1 ==", "== 1"]) {
      const response = await compare(input);
      expect(response.success, input).toBe(false);
      expect(response.error).toMatch(/missing an operand/);
    }
  });

  it("names the operand that failed to parse", async () => {
    const left = await compare("this is not js == 1");
    expect(left.success).toBe(false);
    expect(left.error).toContain('Failed to parse left operand "this is not js"');

    const right = await compare("1 == this is not js");
    expect(right.success).toBe(false);
    expect(right.error).toContain('Failed to parse right operand "this is not js"');
  });

  it("ignores an operator that only appears inside a string", async () => {
    const response = await compare("'a == b'");
    expect(response.success).toBe(false);
    expect(response.error).toMatch(/Expected a binary expression/);
  });

  it("reports a comparison that throws, with the thrown error's message", async () => {
    // ToPrimitive on this object throws, and the failure must reach the caller.
    const response = await compare("({ valueOf: () => { throw new Error('nope'); } }) == 1");
    expect(response.success).toBe(false);
    expect(response.error).toContain("Error: nope");
  });
});

describe("through the HTTP route, with the real worker", () => {
  /**
   * The status code is the part a client acts on, and a bad input used to
   * arrive as a 500 because the worker threw instead of answering. The app is
   * deliberately not closed: its onClose hook would tear down the sandbox this
   * file shares, and nothing is bound to a port.
   */
  const app = () =>
    buildTraceApp({
      config: { PORT: 0, HOST: "127.0.0.1", MAX_TIMEOUT_MS: 30_000, MAX_SOURCE_LENGTH: 20_000, LOG_LEVEL: "silent" },
      sandbox,
    });

  it("answers 400 for a snippet that does not parse", async () => {
    const res = await app().inject({
      method: "POST",
      url: "/execute/type-conversion",
      payload: { functionName: "ToNumber", input: "this is not javascript" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ success: false, functionName: "ToNumber" });
    expect(res.json().error).toContain("SyntaxError");
  });

  it("answers 400 for an expression whose operand does not parse", async () => {
    const res = await app().inject({
      method: "POST",
      url: "/execute/equality",
      payload: { input: "this is not js == 1" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain("left operand");
  });

  it("answers 400, naming the type, when the conversion throws", async () => {
    const res = await app().inject({
      method: "POST",
      url: "/execute/type-conversion",
      payload: { functionName: "ToNumber", input: "Symbol('x')" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain("TypeError");
  });
});

describe("input the tracer cannot parse", () => {
  it("comes back as a failed trace, not an exception, so the route answers 400", async () => {
    const result = await convert("ToNumber", "const =");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Failed to parse input/);
  });

  it("says the same for an operand the equality path cannot read", async () => {
    const result = await compare("{} == const =");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
