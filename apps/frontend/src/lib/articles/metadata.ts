import type { Metadata } from "next";

import { OG_CARD, ogCardUrl, SITE_ORIGIN } from "@/lib/site";

import { isArticleIndexed, isListIndexed } from "./indexing";
import { loadArticles } from "./load";
import { type Article, type ArticleLanguage, articlePath, listPath } from "./types";

export const LIST_COPY: Record<
  ArticleLanguage,
  { title: string; description: string; name: string }
> = {
  en: {
    title: "Articles",
    description:
      "How JavaScript engines work inside: the ECMAScript contract first, then what V8, JavaScriptCore, Hermes and SpiderMonkey show, with live output from JSLab.",
    name: "English",
  },
  ru: {
    title: "Статьи",
    description:
      "Как устроены движки JavaScript изнутри: сначала контракт ECMAScript, затем то, что показывают V8, JavaScriptCore, Hermes и SpiderMonkey, с живым выводом JSLab.",
    name: "Русский",
  },
};

const card = (title: string, description: string) => [
  {
    url: ogCardUrl(SITE_ORIGIN, { title, subtitle: description }),
    width: OG_CARD.width,
    height: OG_CARD.height,
    alt: title,
  },
];

export function listMetadata(language: ArticleLanguage): Metadata {
  const { title, description } = LIST_COPY[language];
  return {
    title,
    description,
    alternates: {
      canonical: listPath(language),
      languages: { en: listPath("en"), ru: listPath("ru") },
    },
    openGraph: { title, description, url: listPath(language), images: card(title, description) },
    ...(isListIndexed(loadArticles(language)) ? {} : { robots: { index: false } }),
  };
}

export function articleMetadata(article: Article): Metadata {
  const { title, description, slug, language } = article;
  return {
    title,
    description,
    alternates: {
      canonical: articlePath(language, slug),
      languages: { en: articlePath("en", slug), ru: articlePath("ru", slug) },
    },
    openGraph: {
      type: "article",
      title,
      description,
      url: articlePath(language, slug),
      locale: language === "en" ? "en_US" : "ru_RU",
      images: card(title, description),
    },
    ...(isArticleIndexed(article) ? {} : { robots: { index: false } }),
  };
}
