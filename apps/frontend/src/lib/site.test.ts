/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

/**
 * SITE_ORIGIN is read once at module load (it feeds canonical URLs, the
 * sitemap and OpenGraph tags), so each case re-imports the module in isolation.
 */

const load = async () => {
  let mod!: typeof import("./site");
  await jest.isolateModulesAsync(async () => {
    mod = await import("./site");
  });
  return mod;
};

beforeEach(() => {
  delete process.env.SITE_ORIGIN;
});

afterEach(() => {
  delete process.env.SITE_ORIGIN;
});

describe("SITE_ORIGIN", () => {
  it("defaults to the production origin", async () => {
    const { SITE_ORIGIN, SITE_HOST } = await load();
    expect(SITE_ORIGIN).toBe("https://jslab.su");
    expect(SITE_HOST).toBe("jslab.su");
  });

  it("takes the configured origin, trimmed of whitespace and a trailing slash", async () => {
    process.env.SITE_ORIGIN = "  https://staging.jslab.su/  ";
    const { SITE_ORIGIN, SITE_HOST } = await load();
    expect(SITE_ORIGIN).toBe("https://staging.jslab.su");
    expect(SITE_HOST).toBe("staging.jslab.su");
  });

  it("keeps a non-default port in the host", async () => {
    process.env.SITE_ORIGIN = "http://localhost:3000";
    expect((await load()).SITE_HOST).toBe("localhost:3000");
  });

  it("fails loudly rather than emitting relative canonical URLs", async () => {
    // A bad origin silently poisons every canonical tag and the sitemap.
    process.env.SITE_ORIGIN = "jslab.su";
    await expect(load()).rejects.toThrow(/SITE_ORIGIN is not a valid absolute URL/);
  });

  it("rejects an empty origin", async () => {
    process.env.SITE_ORIGIN = "   ";
    await expect(load()).rejects.toThrow(/SITE_ORIGIN is not a valid absolute URL/);
  });
});

describe("siteUrl", () => {
  it("joins an absolute path to the origin", async () => {
    const { siteUrl } = await load();
    expect(siteUrl("/playground")).toBe("https://jslab.su/playground");
  });

  it("adds the missing separator for a relative path", async () => {
    const { siteUrl } = await load();
    expect(siteUrl("playground")).toBe("https://jslab.su/playground");
  });

  it("returns the origin itself for the root path", async () => {
    const { siteUrl } = await load();
    expect(siteUrl("/")).toBe("https://jslab.su/");
  });
});

describe("REPO_URL", () => {
  it("points at the project's repository", async () => {
    expect((await load()).REPO_URL).toBe("https://github.com/pavlof01/jslab");
  });
});
