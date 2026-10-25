/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";

import sitemap from "@/app/sitemap";

import { articleSitemap } from "./sitemap";

const series = (published: string[]) =>
  ["why-jslab-exists", "deoptimization"].map((slug) => ({
    slug,
    status: published.includes(slug) ? ("published" as const) : ("draft" as const),
  }));

describe("article sitemap entries", () => {
  it("lists nothing while every article is a draft", () => {
    expect(articleSitemap(series([]))).toEqual([]);
  });

  it("lists the list and the published article only", () => {
    const urls = articleSitemap(series(["deoptimization"])).map((entry) => entry.url);
    expect(urls).toEqual(["https://jslab.su/articles", "https://jslab.su/articles/deoptimization"]);
  });
});

describe("sitemap.xml", () => {
  it("keeps exactly the five tool URLs while the series is in draft", () => {
    expect(sitemap().map((entry) => entry.url)).toEqual([
      "https://jslab.su/",
      "https://jslab.su/playground",
      "https://jslab.su/v8-pipeline",
      "https://jslab.su/type-conversion",
      "https://jslab.su/equality",
    ]);
  });
});
