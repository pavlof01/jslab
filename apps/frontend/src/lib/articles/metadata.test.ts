/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";

import NotFoundCheck from "@/app/articles/[slug]/page";

import { articleMetadata, listMetadata } from "./metadata";
import type { Article } from "./types";

const article: Article = {
  slug: "deoptimization",
  number: 16,
  title: "Deoptimization",
  description: "When optimized code gives up.",
  tags: ["javascript"],
  status: "draft",
  body: "Text.",
};

describe("article metadata", () => {
  it("gives an article its canonical, card and draft noindex", () => {
    const meta = articleMetadata(article);
    expect(meta.title).toBe(article.title);
    expect(meta.description).toBe(article.description);
    expect(meta.alternates).toEqual({ canonical: "/articles/deoptimization" });
    expect(meta.robots).toEqual({ index: false });
    expect(meta.openGraph?.images).toBeDefined();
  });

  it("drops noindex once an article is published", () => {
    expect(articleMetadata({ ...article, status: "published" }).robots).toBeUndefined();
  });

  it("titles the list and keeps it out of the index while nothing is published", () => {
    const meta = listMetadata();
    expect(meta.title).toBe("Articles");
    expect(meta.alternates?.canonical).toBe("/articles");
    expect(meta.robots).toEqual({ index: false });
  });

  it("answers an unknown slug with the not-found page", async () => {
    await expect(
      NotFoundCheck({ params: Promise.resolve({ slug: "no-such-article" }) }),
    ).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
  });
});
