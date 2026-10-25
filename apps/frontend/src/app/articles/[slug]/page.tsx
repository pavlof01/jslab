import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ArticleView from "@/components/Article/ArticleView";
import { buildBlocks } from "@/lib/articles/blocks";
import { findArticle, loadArticles } from "@/lib/articles/load";
import { articleMetadata } from "@/lib/articles/metadata";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export const generateStaticParams = () => loadArticles().map((article) => ({ slug: article.slug }));

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const article = findArticle((await params).slug);
  return article ? articleMetadata(article) : {};
};

const ArticlesArticlePage = async ({ params }: Props) => {
  const article = findArticle((await params).slug);
  if (!article) notFound();
  return <ArticleView article={article} blocks={await buildBlocks(article.body)} />;
};

export default ArticlesArticlePage;
