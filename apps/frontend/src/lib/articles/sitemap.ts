import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

import { isArticleIndexed, isListIndexed } from "./indexing";
import {
  ARTICLE_LANGUAGES,
  type ArticleLanguage,
  type ArticleMeta,
  articlePath,
  listPath,
} from "./types";

export function articleSitemap(
  articles: Record<ArticleLanguage, Pick<ArticleMeta, "slug" | "status">[]>,
): MetadataRoute.Sitemap {
  return ARTICLE_LANGUAGES.flatMap((language) => {
    const list = articles[language];
    if (!isListIndexed(list)) return [];
    return [
      { url: siteUrl(listPath(language)), changeFrequency: "weekly" as const, priority: 0.7 },
      ...list.filter(isArticleIndexed).map((article) => ({
        url: siteUrl(articlePath(language, article.slug)),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ];
  });
}
