import type { Metadata } from "next";

import ArticleList from "@/components/Article/ArticleList";
import { loadArticles } from "@/lib/articles/load";
import { listMetadata } from "@/lib/articles/metadata";

export const dynamic = "force-static";

export const metadata: Metadata = listMetadata("ru");

const RuArticlesPage = () => <ArticleList language="ru" articles={loadArticles("ru")} />;

export default RuArticlesPage;
