/**
 * The trace tree is the wire format the visualizer renders, so its shape is a
 * contract: step kinds keep their own fields, `call` steps nest their
 * sub-algorithm, and every algorithm carries the spec link the UI hangs off.
 *
 * Value fidelity itself is covered by serialize.test.mts.
 */
import { describe, expect, it } from "vitest";
import {
  serializeNode,
  serializeStep,
  toSerializedValue,
} from "../src/server/execute/serialize.ts";
import { ALGO_SPEC_URL } from "../src/server/spec-generator.ts";
import type { TraceNode, TraceStep } from "../src/trace/index.mts";

/** The recorder hands steps over as display strings; build them the same way. */
const step = (over: Partial<TraceStep>): TraceStep => ({ kind: "operation", ...over }) as TraceStep;

describe("toSerializedValue", () => {
  it.each([
    [undefined, { type: "Undefined" }],
    ["undefined", { type: "Undefined" }],
    ["null", { type: "Null", value: null }],
    ["true", { type: "Boolean", value: true }],
    ["false", { type: "Boolean", value: false }],
    ["NaN", { type: "Number", value: "NaN" }],
    ["42", { type: "Number", value: 42 }],
    ["-0", { type: "Number", value: -0 }],
    ["3.14", { type: "Number", value: 3.14 }],
    ["1e3", { type: "Number", value: 1000 }],
    ['"text"', { type: "String", value: "text" }],
    ["10n", { type: "BigInt", value: "10" }],
    ["-10n", { type: "BigInt", value: "-10" }],
  ])("recovers %s", (input, expected) => {
    expect(toSerializedValue(input as string | undefined)).toEqual(expected);
  });

  it("recognises a bare type name as that type's placeholder", () => {
    // The recorder writes type tags for values it never materialised.
    expect(toSerializedValue("Object")).toEqual({
      type: "Object",
      value: { id: "obj", class: "Object" },
    });
    expect(toSerializedValue("String")).toEqual({ type: "String", value: "" });
    expect(toSerializedValue("Symbol")).toEqual({ type: "Symbol", value: { id: "sym" } });
    expect(toSerializedValue("BigInt")).toEqual({ type: "BigInt", value: "0" });
  });

  it("keeps an object or array display string as a preview", () => {
    expect(toSerializedValue("{ a: 1 }")).toEqual({
      type: "Object",
      value: { id: "display", class: "", preview: "{ a: 1 }" },
    });
    expect(toSerializedValue("[1, 2]")).toMatchObject({
      type: "Object",
      value: { preview: "[1, 2]" },
    });
  });

  it("falls back to a String for anything it cannot classify", () => {
    expect(toSerializedValue("some free text")).toEqual({
      type: "String",
      value: "some free text",
    });
  });
});

describe("serializeStep", () => {
  it("keeps the branch decision on an if step", () => {
    expect(
      serializeStep(step({ kind: "if", description: "If Type(x) is Object", taken: true })),
    ).toEqual({
      kind: "if",
      hint: undefined,
      description: "If Type(x) is Object",
      taken: true,
    });
  });

  it("puts a return step's answer under `value`", () => {
    expect(serializeStep(step({ kind: "return", output: "42" }))).toMatchObject({
      kind: "return",
      value: { type: "Number", value: 42 },
    });
  });

  it("puts an operation step's answer under `result`", () => {
    expect(serializeStep(step({ kind: "operation", output: '"1"' }))).toMatchObject({
      result: { type: "String", value: "1" },
    });
  });

  it("omits `result` for an operation that produced nothing", () => {
    expect(
      serializeStep(step({ kind: "operation", description: "Assert: x is a Number" })),
    ).not.toHaveProperty("result");
  });

  it("carries a call step's algorithm, inputs, output and spec link", () => {
    const serialized = serializeStep(
      step({ kind: "call", algoId: "ToPrimitive", inputs: ["42", "number"], output: "42" }),
    );

    expect(serialized).toMatchObject({
      kind: "call",
      algoId: "ToPrimitive",
      inputs: [
        { type: "Number", value: 42 },
        { type: "String", value: "number" },
      ],
      output: { type: "Number", value: 42 },
      specUrl: ALGO_SPEC_URL.ToPrimitive,
    });
  });

  it("carries a call step's error instead of an output", () => {
    const serialized = serializeStep(
      step({ kind: "call", algoId: "ToNumber", error: "TypeError" }),
    );
    expect(serialized.error).toBe("TypeError");
    expect(serialized).not.toHaveProperty("output");
  });

  it("recurses into a call step's own steps", () => {
    const serialized = serializeStep(
      step({
        kind: "call",
        algoId: "ToPrimitive",
        steps: [
          step({
            kind: "call",
            algoId: "OrdinaryToPrimitive",
            steps: [step({ kind: "return", output: "1" })],
          }),
        ],
      }),
    );

    expect(serialized.steps?.[0].algoId).toBe("OrdinaryToPrimitive");
    expect(serialized.steps?.[0].steps?.[0]).toMatchObject({
      kind: "return",
      value: { type: "Number", value: 1 },
    });
  });

  it("drops a call step with no algorithm, which has nothing to link to", () => {
    const serialized = serializeStep(step({ kind: "call" }));
    expect(serialized).not.toHaveProperty("algoId");
    expect(serialized).not.toHaveProperty("inputs");
  });

  it("leaves an unknown algorithm without a spec link rather than inventing one", () => {
    expect(
      serializeStep(step({ kind: "call", algoId: "MadeUpOperation" })).specUrl,
    ).toBeUndefined();
  });
});

describe("serializeNode", () => {
  const node = (over: Partial<TraceNode>): TraceNode =>
    ({ algoId: "ToNumber", inputs: [], steps: [], ...over }) as TraceNode;

  it("carries the algorithm, its inputs, its output and its spec link", () => {
    const serialized = serializeNode(node({ inputs: ['"42"'], output: "42" }));

    expect(serialized).toMatchObject({
      algoId: "ToNumber",
      inputs: [{ type: "String", value: "42" }],
      output: { type: "Number", value: 42 },
      specUrl: ALGO_SPEC_URL.ToNumber,
    });
  });

  it("leaves output undefined when the algorithm produced none", () => {
    expect(serializeNode(node({})).output).toBeUndefined();
  });

  it("carries the node's error", () => {
    expect(serializeNode(node({ error: "TypeError: Cannot convert" })).error).toBe(
      "TypeError: Cannot convert",
    );
  });

  it("serializes every step in order", () => {
    const serialized = serializeNode(
      node({ steps: [step({ kind: "if", taken: false }), step({ kind: "return", output: "1" })] }),
    );

    expect(serialized.steps.map((s) => s.kind)).toEqual(["if", "return"]);
  });

  it("treats a missing inputs list as no inputs", () => {
    expect(serializeNode(node({ inputs: undefined as unknown as string[] })).inputs).toEqual([]);
  });
});
