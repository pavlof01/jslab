import type { Metadata } from "next";

import { OG_CARD, ogCardUrl, SITE_ORIGIN } from "@/lib/site";

import { isArticleIndexed, isListIndexed } from "./indexing";
import { loadArticles } from "./load";
import { type Article, articlePath, LIST_PATH } from "./types";

export const LIST_COPY = {
  title: "Articles",
  description:
    "How JavaScript engines work inside: the ECMAScript contract first, then what V8, JavaScriptCore, Hermes and SpiderMonkey show, with live output from JSLab.",
  empty: "The first articles are on their way.",
};

const card = (title: string, description: string) => [
  {
    url: ogCardUrl(SITE_ORIGIN, { title, subtitle: description }),
    width: OG_CARD.width,
    height: OG_CARD.height,
    alt: title,
  },
];

export function listMetadata(): Metadata {
  const { title, description } = LIST_COPY;
  return {
    title,
    description,
    alternates: { canonical: LIST_PATH },
    openGraph: { title, description, url: LIST_PATH, images: card(title, description) },
    ...(isListIndexed(loadArticles()) ? {} : { robots: { index: false } }),
  };
}

export function articleMetadata(article: Article): Metadata {
  const { title, description, slug } = article;
  return {
    title,
    description,
    alternates: { canonical: articlePath(slug) },
    openGraph: {
      type: "article",
      title,
      description,
      url: articlePath(slug),
      locale: "en_US",
      images: card(title, description),
    },
    ...(isArticleIndexed(article) ? {} : { robots: { index: false } }),
  };
}
