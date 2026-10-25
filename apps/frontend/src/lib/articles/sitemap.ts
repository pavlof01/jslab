import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

import { isArticleIndexed, isListIndexed } from "./indexing";
import { type ArticleMeta, articlePath, LIST_PATH } from "./types";

export function articleSitemap(
  articles: Pick<ArticleMeta, "slug" | "status">[],
): MetadataRoute.Sitemap {
  if (!isListIndexed(articles)) return [];
  return [
    { url: siteUrl(LIST_PATH), changeFrequency: "weekly" as const, priority: 0.7 },
    ...articles.filter(isArticleIndexed).map((article) => ({
      url: siteUrl(articlePath(article.slug)),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
