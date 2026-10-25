import { describe, expect, it } from "@jest/globals";

import { isMobileClient } from "./device";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID_PHONE =
  "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36";
const ANDROID_TABLET =
  "Mozilla/5.0 (Linux; Android 15; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";
const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";

describe("isMobileClient", () => {
  it.each([
    ["an iPhone", IPHONE, true],
    ["an Android phone", ANDROID_PHONE, true],
    ["an Android tablet", ANDROID_TABLET, false],
    ["a desktop browser", MAC, false],
    ["a request without a user agent", null, false],
  ])("reads %s from the user agent", (_label, userAgent, expected) => {
    expect(isMobileClient(userAgent, null)).toBe(expected);
  });

  it("prefers the Sec-CH-UA-Mobile client hint over the user agent", () => {
    expect(isMobileClient(MAC, "?1")).toBe(true);
    expect(isMobileClient(ANDROID_PHONE, "?0")).toBe(false);
  });
});
