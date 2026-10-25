export type ArticleStatus = "draft" | "published";

export type ArticleMeta = {
  slug: string;
  number: number;
  title: string;
  description: string;
  tags: string[];
  status: ArticleStatus;
};

export type Article = ArticleMeta & { body: string };

export const LIST_PATH = "/articles";

export const articlePath = (slug: string): string => `${LIST_PATH}/${slug}`;
