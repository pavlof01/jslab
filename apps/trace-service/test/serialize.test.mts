/**
 * Golden tests for result type fidelity.
 *
 * The service used to serialize an algorithm's return value by rendering it to a
 * display string and re-parsing that string. `fromEngineValue` reads the spec type
 * straight off the engine262 Value instead; the cases below pin the difference.
 */
import { describe, expect, it } from "vitest";
import {
  type EngineValue,
  fromEngineValue,
  type SerializedValue,
  toSerializedValue,
} from "../src/server/execute/serialize.ts";

const jsString = (value: string): EngineValue => ({ type: "String", value });
const jsNumber = (value: number): EngineValue => ({ type: "Number", value });
const jsBigInt = (value: bigint): EngineValue => ({ type: "BigInt", value });
const jsBoolean = (value: boolean): EngineValue => ({ type: "Boolean", value });
const jsSymbol = (description?: string): EngineValue => ({
  type: "Symbol",
  Description: description === undefined ? { value: undefined } : { value: description },
});
const jsObject = (
  internalSlotsList: string[] = [],
  slots: Record<string, EngineValue> = {},
): EngineValue => ({ type: "Object", internalSlotsList, ...slots }) as EngineValue;

const GOLDEN: readonly [label: string, value: EngineValue, expected: SerializedValue][] = [
  ['ToString(true) → the String "true"', jsString("true"), { type: "String", value: "true" }],
  ['ToString(42) → the String "42"', jsString("42"), { type: "String", value: "42" }],
  ['ToString(null) → the String "null"', jsString("null"), { type: "String", value: "null" }],
  [
    'ToString(undefined) → the String "undefined"',
    jsString("undefined"),
    { type: "String", value: "undefined" },
  ],
  [
    'ToString({}) → the String "[object Object]"',
    jsString("[object Object]"),
    { type: "String", value: "[object Object]" },
  ],
  ["the empty String", jsString(""), { type: "String", value: "" }],
  ['ToNumber("42") → the Number 42', jsNumber(42), { type: "Number", value: 42 }],
  ['ToNumber("") → the Number +0', jsNumber(0), { type: "Number", value: 0 }],
  ['ToNumber("-0") → the Number -0', jsNumber(-0), { type: "Number", value: "-0" }],
  ['ToNumber("abc") → NaN', jsNumber(Number.NaN), { type: "Number", value: "NaN" }],
  [
    'ToNumber("Infinity") → +∞',
    jsNumber(Number.POSITIVE_INFINITY),
    { type: "Number", value: "Infinity" },
  ],
  [
    'ToNumber("-Infinity") → -∞',
    jsNumber(Number.NEGATIVE_INFINITY),
    { type: "Number", value: "-Infinity" },
  ],
  ['ToBoolean("0") → the Boolean true', jsBoolean(true), { type: "Boolean", value: true }],
  ['ToBoolean("") → the Boolean false', jsBoolean(false), { type: "Boolean", value: false }],
  ['ToBigInt("7") → the BigInt 7', jsBigInt(7n), { type: "BigInt", value: "7" }],
  ["a negative BigInt", jsBigInt(-7n), { type: "BigInt", value: "-7" }],
  ["undefined", { type: "Undefined", value: undefined }, { type: "Undefined" }],
  ["null", { type: "Null", value: null }, { type: "Null", value: null }],
  [
    'ToPropertyKey(Symbol("tag")) → a Symbol',
    jsSymbol("tag"),
    { type: "Symbol", value: { id: "sym", description: "tag" } },
  ],
  [
    "a Symbol without a description",
    jsSymbol(),
    { type: "Symbol", value: { id: "sym", description: undefined } },
  ],
  [
    "ToObject({}) → an Object",
    jsObject(),
    { type: "Object", value: { id: "obj", class: "Object" } },
  ],
  [
    "ToObject(42) → a Number wrapper",
    jsObject(["NumberData"], { NumberData: jsNumber(42) }),
    { type: "Object", value: { id: "obj", class: "Number", preview: "42" } },
  ],
  [
    'ToObject("hi") → a String wrapper',
    jsObject(["StringData"], { StringData: jsString("hi") }),
    { type: "Object", value: { id: "obj", class: "String", preview: '"hi"' } },
  ],
  [
    "ToObject(7n) → a BigInt wrapper",
    jsObject(["BigIntData"], { BigIntData: jsBigInt(7n) }),
    { type: "Object", value: { id: "obj", class: "BigInt", preview: "7n" } },
  ],
  [
    "a callable object",
    jsObject(["Call"]),
    { type: "Object", value: { id: "obj", class: "Function" } },
  ],
];

describe("fromEngineValue", () => {
  for (const [label, value, expected] of GOLDEN) {
    it(`serializes ${label}`, () => {
      expect(fromEngineValue(value)).toEqual(expected);
    });
  }

  it("survives the JSON transport the frontend receives", () => {
    const nonFinite = [
      jsNumber(Number.NaN),
      jsNumber(Number.POSITIVE_INFINITY),
      jsNumber(Number.NEGATIVE_INFINITY),
      jsNumber(-0),
    ];
    const rendered = nonFinite.map((value) => JSON.parse(JSON.stringify(fromEngineValue(value))));
    expect(rendered).toEqual([
      { type: "Number", value: "NaN" },
      { type: "Number", value: "Infinity" },
      { type: "Number", value: "-Infinity" },
      { type: "Number", value: "-0" },
    ]);
  });
});

describe("the display-string round trip it replaced", () => {
  // These document why the round trip had to go: the strings ToString produces are
  // indistinguishable from the display form of other spec types.
  it("mis-types ToString(true) as a Boolean", () => {
    expect(toSerializedValue("true")).toEqual({ type: "Boolean", value: true });
    expect(fromEngineValue(jsString("true"))).toEqual({ type: "String", value: "true" });
  });

  it("mis-types ToString(42) as a Number", () => {
    expect(toSerializedValue("42")).toEqual({ type: "Number", value: 42 });
    expect(fromEngineValue(jsString("42"))).toEqual({ type: "String", value: "42" });
  });

  it("mis-types ToString(null) as Null", () => {
    expect(toSerializedValue("null")).toEqual({ type: "Null", value: null });
    expect(fromEngineValue(jsString("null"))).toEqual({ type: "String", value: "null" });
  });
});

describe("output size bound", () => {
  // A short expression like "'a'.repeat(50_000_000)" builds a huge string well
  // inside the worker's time/heap budget; without a cap here that string is
  // embedded verbatim in the response (and again in every trace step that
  // references it). This pins that the cap exists and is a huge-input
  // regression, not that it enforces one particular byte count.
  it("caps a huge String Value instead of embedding it verbatim", () => {
    const huge = "a".repeat(1_000_000);
    const result = fromEngineValue(jsString(huge));
    expect(result.type).toBe("String");
    if (result.type !== "String") throw new Error("unreachable");
    expect(result.value.length).toBeLessThan(huge.length);
    expect(result.value).toContain("truncated");
  });

  it("leaves ordinary-length strings untouched", () => {
    expect(fromEngineValue(jsString("hello"))).toEqual({ type: "String", value: "hello" });
  });

  it("caps a huge BigInt Value's decimal representation", () => {
    const huge = 10n ** 100_000n;
    const result = fromEngineValue(jsBigInt(huge));
    expect(result.type).toBe("BigInt");
    if (result.type !== "BigInt") throw new Error("unreachable");
    expect(result.value.length).toBeLessThan(String(huge).length);
  });

  it("caps a huge quoted-string display value in the round-trip parser", () => {
    const huge = `"${"a".repeat(1_000_000)}"`;
    const result = toSerializedValue(huge);
    expect(result.type).toBe("String");
    if (result.type !== "String") throw new Error("unreachable");
    expect(result.value.length).toBeLessThan(huge.length);
  });
});
