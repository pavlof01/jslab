import type { ArticleMeta } from "./types";

export const isArticleIndexed = (article: Pick<ArticleMeta, "status">): boolean =>
  article.status === "published";

export const isListIndexed = (articles: Pick<ArticleMeta, "status">[]): boolean =>
  articles.some(isArticleIndexed);
