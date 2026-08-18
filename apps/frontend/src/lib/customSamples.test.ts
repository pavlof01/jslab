import { describe, expect, it } from "@jest/globals";

import {
  isNameTaken,
  parseCustomSamples,
  validateName,
  type CustomSample,
} from "@/lib/customSamples";
import { sampleCatalog } from "@/lib/samples";

const sample = (over: Partial<CustomSample> = {}): CustomSample => ({
  id: "a",
  name: "Mine",
  code: "1 + 1",
  createdAt: 0,
  ...over,
});

describe("parseCustomSamples", () => {
  it("returns nothing for absent or malformed storage", () => {
    expect(parseCustomSamples(null)).toEqual([]);
    expect(parseCustomSamples("not json")).toEqual([]);
    expect(parseCustomSamples('{"not":"an array"}')).toEqual([]);
  });

  it("drops entries that are not samples and keeps the ones that are", () => {
    const raw = JSON.stringify([
      { id: "a", name: "Keep", code: "x", createdAt: 1 },
      { id: "b", name: "No code" },
      "nope",
      null,
    ]);

    expect(parseCustomSamples(raw)).toEqual([{ id: "a", name: "Keep", code: "x", createdAt: 1 }]);
  });

  it("keeps entries written before createdAt existed", () => {
    const raw = JSON.stringify([{ id: "a", name: "Old", code: "x" }]);
    expect(parseCustomSamples(raw)).toEqual([{ id: "a", name: "Old", code: "x", createdAt: 0 }]);
  });

  it("accepts an optional description and rejects a non-string one", () => {
    expect(parseCustomSamples(JSON.stringify([sample({ description: "why" })]))[0].description).toBe("why");
    expect(parseCustomSamples(JSON.stringify([{ ...sample(), description: 7 }]))).toEqual([]);
  });
});

describe("isNameTaken", () => {
  const saved = [sample({ id: "a", name: "Mine" })];

  it("ignores case", () => {
    expect(isNameTaken("mine", saved)).toBe(true);
    expect(isNameTaken("MINE", saved)).toBe(true);
  });

  it("ignores surrounding whitespace", () => {
    expect(isNameTaken("  Mine  ", saved)).toBe(true);
  });

  it("lets a snippet keep its own name while renaming", () => {
    expect(isNameTaken("Mine", saved, "a")).toBe(false);
  });

  it("also refuses a name the shipped catalog already uses", () => {
    expect(isNameTaken(sampleCatalog[0].label, [])).toBe(true);
  });

  it("allows a name nothing uses", () => {
    expect(isNameTaken("Something else entirely", saved)).toBe(false);
  });
});

describe("validateName", () => {
  it("rejects an empty or whitespace-only name", () => {
    expect(validateName("", [])).toBe("empty");
    expect(validateName("   ", [])).toBe("empty");
  });

  it("rejects a duplicate", () => {
    expect(validateName("Mine", [sample()])).toBe("taken");
  });

  it("accepts a usable name", () => {
    expect(validateName("Fresh", [sample()])).toBeUndefined();
  });
});
