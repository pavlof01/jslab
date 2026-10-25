import { describe, expect, it } from "@jest/globals";

import {
  externalLinks,
  isTopLinkActive,
  NAV_GROUPS,
  navEntries,
  type NavGroup,
  tools,
  topLinks,
} from "./tools";

describe("tool catalog", () => {
  it("gives every tool a unique route", () => {
    const hrefs = tools.map((tool) => tool.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("points every internal tool at an absolute path", () => {
    for (const tool of tools) expect(tool.href.startsWith("/")).toBe(true);
  });

  it("places every tool and link in a declared nav group", () => {
    const groups = new Set(NAV_GROUPS.map((entry) => entry.group));
    for (const tool of tools) expect(groups.has(tool.group)).toBe(true);
    for (const link of externalLinks) expect(groups.has(link.group)).toBe(true);
  });

  it("keeps sitemap priorities in the range crawlers accept", () => {
    for (const tool of tools) {
      expect(tool.priority).toBeGreaterThan(0);
      expect(tool.priority).toBeLessThanOrEqual(1);
    }
  });

  it("describes every tool for the nav and for search engines", () => {
    for (const tool of tools) {
      expect(tool.label.length).toBeGreaterThan(0);
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });
});

describe("navEntries", () => {
  it("lists the engine tools under the engines group", () => {
    const entries = navEntries("engines");
    expect(entries.map((entry) => entry.href)).toEqual(["/playground", "/v8-pipeline"]);
    expect(entries.every((entry) => entry.external === undefined)).toBe(true);
  });

  it("puts internal tools before external links within a group", () => {
    const entries = navEntries("spec");
    expect(entries[0].href).toBe("/type-conversion");
    expect(entries.at(-1)).toMatchObject({ href: "https://tc39.es/ecma262/", external: true });
  });

  it("marks external links so the nav can render them differently", () => {
    for (const entry of navEntries("learn")) expect(entry.external).toBe(true);
  });

  it("returns nothing for a group with no members", () => {
    expect(navEntries("nonexistent" as NavGroup)).toEqual([]);
  });

  it("exposes only the fields the nav renders", () => {
    for (const entry of navEntries("engines")) {
      expect(Object.keys(entry).sort()).toEqual(["description", "href", "label"]);
    }
  });
});

describe("top-level header links", () => {
  const [articles] = topLinks;

  it("puts Articles in the header as a plain link to /articles", () => {
    expect(articles).toMatchObject({ href: "/articles", label: "Articles" });
  });

  it("reads as active under /articles and nowhere else", () => {
    for (const path of ["/articles", "/articles/deoptimization"]) {
      expect(isTopLinkActive(path, articles)).toBe(true);
    }
    for (const path of ["/", "/playground", "/articlesx"]) {
      expect(isTopLinkActive(path, articles)).toBe(false);
    }
  });
});
