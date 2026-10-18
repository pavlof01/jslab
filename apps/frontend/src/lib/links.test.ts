import { describe, expect, it } from "@jest/globals";

import { ECMA262_URL, ecma262SectionUrl, REPO_URL } from "./links";

describe("REPO_URL", () => {
  it("points at the project's repository", () => {
    expect(REPO_URL).toBe("https://github.com/pavlof01/jslab");
  });
});

describe("ecma262SectionUrl", () => {
  it("anchors a lower-cased section id in the spec", () => {
    expect(ecma262SectionUrl("ToPrimitive")).toBe(`${ECMA262_URL}#sec-toprimitive`);
  });
});
