export type ArticleLanguage = "en" | "ru";

export type ArticleStatus = "draft" | "published";

export type ArticleMeta = {
  slug: string;
  number: number;
  language: ArticleLanguage;
  title: string;
  description: string;
  tags: string[];
  status: ArticleStatus;
};

export type Article = ArticleMeta & { body: string };

export const ARTICLE_LANGUAGES: ArticleLanguage[] = ["en", "ru"];

export const otherLanguage = (language: ArticleLanguage): ArticleLanguage =>
  language === "en" ? "ru" : "en";

export const listPath = (language: ArticleLanguage): string =>
  language === "en" ? "/articles" : "/ru/articles";

export const articlePath = (language: ArticleLanguage, slug: string): string =>
  `${listPath(language)}/${slug}`;
