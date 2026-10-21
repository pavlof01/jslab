/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";

import NotFoundCheck from "@/app/articles/[slug]/page";

import { findArticle } from "./load";
import { articleMetadata, listMetadata } from "./metadata";

describe("article metadata", () => {
  it("gives an article its canonical, hreflang pair, card and draft noindex", () => {
    const article = findArticle("en", "deoptimization");
    if (!article) throw new Error("missing article");
    const meta = articleMetadata(article);
    expect(meta.title).toBe(article.title);
    expect(meta.description).toBe(article.description);
    expect(meta.alternates).toEqual({
      canonical: "/articles/deoptimization",
      languages: { en: "/articles/deoptimization", ru: "/ru/articles/deoptimization" },
    });
    expect(meta.robots).toEqual({ index: false });
    expect(meta.openGraph?.images).toBeDefined();
  });

  it("drops noindex once an article is published", () => {
    const article = findArticle("en", "deoptimization");
    if (!article) throw new Error("missing article");
    expect(articleMetadata({ ...article, status: "published" }).robots).toBeUndefined();
  });

  it("titles the Russian list and keeps it out of the index while it only has drafts", () => {
    const meta = listMetadata("ru");
    expect(meta.title).toBe("Статьи");
    expect(meta.alternates?.canonical).toBe("/ru/articles");
    expect(meta.robots).toEqual({ index: false });
  });

  it("answers an unknown slug with the not-found page", async () => {
    await expect(
      NotFoundCheck({ params: Promise.resolve({ slug: "no-such-article" }) }),
    ).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
  });
});
