/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";

import { parseFrontMatter } from "./frontMatter";
import { isArticleIndexed, isListIndexed } from "./indexing";
import { findArticle, loadArticles } from "./load";

describe("article loader", () => {
  it("loads the whole series in both languages with shared slugs", () => {
    const en = loadArticles("en");
    const ru = loadArticles("ru");
    expect(en).toHaveLength(31);
    expect(ru.map((article) => article.slug)).toEqual(en.map((article) => article.slug));
  });

  it("orders by the file number and strips the number from the slug", () => {
    const [first, second] = loadArticles("en");
    expect(first.slug).toBe("why-jslab-exists");
    expect(first.title).toBe("Why I built JSLab: JavaScript is deeper than the way we explain it");
    expect(second.number).toBe(2);
  });

  it("keeps front matter and the title heading out of the body", () => {
    for (const article of [...loadArticles("en"), ...loadArticles("ru")]) {
      expect(article.body).not.toMatch(/^status:|^format:/m);
      expect(article.body.startsWith("# ")).toBe(false);
    }
  });

  it("reads tags and treats a missing status as a draft", () => {
    const article = findArticle("ru", "deoptimization");
    expect(article?.tags).toContain("JavaScript");
    expect(article?.status).toBe("draft");
    expect(findArticle("en", "no-such-article")).toBeUndefined();
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
