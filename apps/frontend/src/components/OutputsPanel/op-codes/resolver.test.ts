import { describe, expect, it } from "@jest/globals";

import { EngineKey } from "@/lib/types";
import { describeEngineToken, TOKEN_DESCRIBERS } from "./index";
import { createDescriber, fromTable, stripEdges } from "./resolver";

describe("stripEdges", () => {
  it("strips the brackets a disassembler wraps an operand in", () => {
    expect(stripEdges("(r1)")).toBe("r1");
    expect(stripEdges("[0],")).toBe("0");
    expect(stripEdges("{a}.")).toBe("a");
  });

  it("keeps a trailing colon by default, so a join step can see it", () => {
    expect(stripEdges("ic:")).toBe("ic:");
  });

  it("drops it when asked — Hermes prints labels as L1:", () => {
    expect(stripEdges("L1:", { keepColon: false })).toBe("L1");
  });
});

describe("createDescriber", () => {
  const table = fromTable({ Add: "adds two things", "ic:7": "inline cache 7" });

  it("returns undefined for nothing at all", () => {
    const describe_ = createDescriber({ steps: [table] });
    expect(describe_(undefined)).toBeUndefined();
    expect(describe_(null)).toBeUndefined();
    expect(describe_("   ")).toBeUndefined();
  });

  it("walks the chain in order and takes the first answer", () => {
    const describe_ = createDescriber({
      steps: [() => undefined, () => "second", () => "third"],
    });
    expect(describe_("x")).toBe("second");
  });

  it("joins a trailing-colon token to the next one", () => {
    const describe_ = createDescriber({ steps: [{ joinNext: table }] });
    expect(describe_("ic:", { nextToken: "7" })).toBe("inline cache 7");
  });

  it("does not join when the token does not end in a colon", () => {
    const describe_ = createDescriber({ steps: [{ joinNext: table }] });
    expect(describe_("ic", { nextToken: "7" })).toBeUndefined();
  });

  it("honours onlyDigits, so a colon token is not joined to a word", () => {
    const describe_ = createDescriber({ steps: [{ joinNext: table, onlyDigits: true }] });
    expect(describe_("ic:", { nextToken: "seven" })).toBeUndefined();
    expect(describe_("ic:", { nextToken: "7" })).toBe("inline cache 7");
  });
});

describe("the engine registry", () => {
  it("has a describer for every engine", () => {
    for (const engine of Object.values(EngineKey)) {
      expect(typeof TOKEN_DESCRIBERS[engine]).toBe("function");
    }
  });

  it("explains a token from each engine's own dictionary, through one call shape", () => {
    expect(describeEngineToken(EngineKey.v8, "Add")).toContain("accumulator");
    expect(describeEngineToken(EngineKey.jsc, "add")).toContain("Add");
    expect(describeEngineToken(EngineKey.hermes, "Add")).toContain("Add");
    expect(describeEngineToken(EngineKey.sm, "GetLocal")).toContain("stack");
  });

  it("still resolves the register families V8 prints", () => {
    expect(describeEngineToken(EngineKey.v8, "Star14")).toContain("r14");
    expect(describeEngineToken(EngineKey.v8, "Ldar7")).toContain("r7");
  });

  it("still resolves an operand through the punctuation around it", () => {
    expect(describeEngineToken(EngineKey.hermes, "r1,")).toContain("register r1");
    expect(describeEngineToken(EngineKey.jsc, "loc5,")).toContain("loc5");
  });

  it("still joins SpiderMonkey's split inline-cache token", () => {
    expect(describeEngineToken(EngineKey.sm, "ic:", "7")).toContain("Inline cache");
  });

  it("says nothing about a token it does not know", () => {
    expect(describeEngineToken(EngineKey.v8, "zzz-not-a-token")).toBeUndefined();
  });
});
