/**
 * @jest-environment node
 */
import { join } from "node:path";

import { describe, expect, it } from "@jest/globals";

import { parseFrontMatter } from "./frontMatter";
import { isArticleIndexed, isListIndexed } from "./indexing";
import { readArticles } from "./load";

const FIXTURES = join(__dirname, "__fixtures__", "en");

describe("article loader", () => {
  it("reads only numbered files", () => {
    expect(readArticles(FIXTURES)).toHaveLength(3);
  });

  it("orders by the file number and strips the number from the slug", () => {
    const articles = readArticles(FIXTURES);
    expect(articles.map((article) => article.slug)).toEqual([
      "first-steps",
      "second-look",
      "tenth",
    ]);
    expect(articles.map((article) => article.number)).toEqual([1, 2, 10]);
    expect(articles[0].title).toBe("First steps: a fixture");
  });

  it("keeps front matter and the title heading out of the body", () => {
    for (const article of readArticles(FIXTURES)) {
      expect(article.body).not.toMatch(/^title:|^status:/m);
      expect(article.body.startsWith("# ")).toBe(false);
      expect(article.body).toMatch(/^Body/);
    }
  });

  it("reads tags and treats a missing status as a draft", () => {
    const [first, second] = readArticles(FIXTURES);
    expect(first.tags).toEqual(["javascript", "v8"]);
    expect(first.status).toBe("published");
    expect(second.tags).toEqual([]);
    expect(second.status).toBe("draft");
  });

  it("treats a missing content directory as an empty series", () => {
    expect(readArticles(join(FIXTURES, "no-such-dir"))).toEqual([]);
  });
});

describe("front matter", () => {
  it("parses quoted values and lists", () => {
    const { data, body } = parseFrontMatter(
      '---\ntitle: "A: b"\ntags:\n  - one\n  - two\nstatus: published\n---\n\nText',
    );
    expect(data).toEqual({ title: "A: b", tags: ["one", "two"], status: "published" });
    expect(body).toBe("\nText");
  });

  it("parses single-quoted values the way the formatter writes them", () => {
    const { data } = parseFrontMatter(
      "---\ndescription: '1 + [1] is \"11\", and it''s fine'\n---\n",
    );
    expect(data).toEqual({ description: '1 + [1] is "11", and it\'s fine' });
  });
});

describe("indexing", () => {
  it("indexes only published articles and lists that show one", () => {
    expect(isArticleIndexed({ status: "draft" })).toBe(false);
    expect(isArticleIndexed({ status: "published" })).toBe(true);
    expect(isListIndexed([{ status: "draft" }, { status: "draft" }])).toBe(false);
    expect(isListIndexed([{ status: "draft" }, { status: "published" }])).toBe(true);
  });
});
