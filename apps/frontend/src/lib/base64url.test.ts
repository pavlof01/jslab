import { describe, expect, it } from "@jest/globals";

import { decodeText, encodeText } from "./base64url";

describe("base64url", () => {
  it("round-trips text, including what needs the url alphabet", () => {
    for (const text of ["1 + 1", "a?b=c&d", "quotes and emoji", "x".repeat(50000)]) {
      expect(decodeText(encodeText(text))).toBe(text);
    }
  });

  it("emits none of +, / or =", () => {
    expect(encodeText("??>>~~")).not.toMatch(/[+/=]/);
  });
});
