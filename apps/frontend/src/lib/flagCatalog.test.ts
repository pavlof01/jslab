import { describe, expect, it } from "@jest/globals";

import { CATEGORY_LABELS, type FlagOption, groupFlags } from "./flagCatalog";

const flag = (over: Partial<FlagOption>): FlagOption => ({
  flag: "--print-bytecode",
  description: "",
  category: "bytecode",
  ...over,
});

describe("groupFlags", () => {
  it("groups flags under their category's label", () => {
    const groups = groupFlags([flag({ flag: "--print-ast", category: "parser" }), flag({})]);
    expect(groups).toEqual([
      { label: "Bytecode", flags: [flag({})] },
      { label: "AST & parser", flags: [flag({ flag: "--print-ast", category: "parser" })] },
    ]);
  });

  it("keeps the catalog's category order, not the input order", () => {
    const groups = groupFlags([
      flag({ flag: "--trace-ic", category: "inline-caches" }),
      flag({ flag: "--print-ast", category: "parser" }),
    ]);
    expect(groups.map((group) => group.label)).toEqual(["AST & parser", "Inline caches"]);
  });

  it("omits categories with nothing in them", () => {
    const groups = groupFlags([flag({})]);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Bytecode");
  });

  it("hides value-bearing flags, which need an input the checkbox list has no room for", () => {
    const groups = groupFlags([
      flag({ flag: "--print-bytecode-filter", takesValue: true }),
      flag({}),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].flags.map((f) => f.flag)).toEqual(["--print-bytecode"]);
  });

  it("drops a flag whose category is not one the UI knows how to label", () => {
    expect(groupFlags([flag({ category: "made-up" as FlagOption["category"] })])).toEqual([]);
  });

  it("returns nothing when the gateway supplied no flags", () => {
    expect(groupFlags([])).toEqual([]);
  });

  it("labels every category exactly once", () => {
    const categories = CATEGORY_LABELS.map((entry) => entry.category);
    expect(new Set(categories).size).toBe(categories.length);
  });
});
