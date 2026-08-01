import { describe, expect, it } from "vitest";
import { extractApiKey, generateApiKey, isValidKeyFormat, KEY_PREFIX } from "./apiKeys.js";

describe("isValidKeyFormat", () => {
  it("accepts a well-formed key", () => {
    expect(isValidKeyFormat(`${KEY_PREFIX}${"a".repeat(32)}`)).toBe(true);
  });
  it("rejects wrong prefix, length, or charset", () => {
    expect(isValidKeyFormat("nope_" + "a".repeat(32))).toBe(false);
    expect(isValidKeyFormat(`${KEY_PREFIX}${"a".repeat(31)}`)).toBe(false);
    expect(isValidKeyFormat(`${KEY_PREFIX}${"Z".repeat(32)}`)).toBe(false);
    expect(isValidKeyFormat("")).toBe(false);
  });
});

describe("generateApiKey", () => {
  it("prefixes and appends the random part", () => {
    expect(generateApiKey(() => "f".repeat(32))).toBe(`${KEY_PREFIX}${"f".repeat(32)}`);
  });
  it("produces format-valid keys by default", () => {
    expect(isValidKeyFormat(generateApiKey())).toBe(true);
  });
});

describe("extractApiKey", () => {
  it("reads x-api-key", () => {
    expect(extractApiKey({ "x-api-key": "  abc  " })).toBe("abc");
  });
  it("reads Authorization: Bearer", () => {
    expect(extractApiKey({ authorization: "Bearer xyz" })).toBe("xyz");
    expect(extractApiKey({ authorization: "bearer  xyz  " })).toBe("xyz");
  });
  it("prefers x-api-key over Authorization", () => {
    expect(extractApiKey({ "x-api-key": "a", authorization: "Bearer b" })).toBe("a");
  });
  it("returns null when absent or malformed", () => {
    expect(extractApiKey({})).toBeNull();
    expect(extractApiKey({ authorization: "Basic abc" })).toBeNull();
    expect(extractApiKey({ "x-api-key": "   " })).toBeNull();
  });
});
