import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { parseFrontMatter } from "./frontMatter";
import { type Article, ARTICLE_LANGUAGES, type ArticleLanguage } from "./types";

const CONTENT_DIR = join(process.cwd(), "content", "articles");

const FILE = /^(\d+)-([a-z0-9-]+)\.md$/;

function readArticle(language: ArticleLanguage, file: string): Article {
  const [, number, slug] = file.match(FILE) ?? [];
  const source = readFileSync(join(CONTENT_DIR, language, file), "utf8");
  const { data, body } = parseFrontMatter(source);
  const text = (key: string) => {
    const value = data[key];
    if (typeof value !== "string" || !value) throw new Error(`${language}/${file}: no ${key}`);
    return value;
  };
  return {
    slug,
    number: Number(number),
    language,
    title: text("title"),
    description: text("description"),
    tags: Array.isArray(data.tags) ? data.tags : [],
    status: data.status === "published" ? "published" : "draft",
    body: body.replace(/^\s*# [^\n]*\n/, "").trimStart(),
  };
}

function readLanguage(language: ArticleLanguage): Article[] {
  return readdirSync(join(CONTENT_DIR, language))
    .filter((file) => FILE.test(file))
    .map((file) => readArticle(language, file))
    .sort((left, right) => left.number - right.number);
}

let cache: Record<ArticleLanguage, Article[]> | null = null;

export function loadAllArticles(): Record<ArticleLanguage, Article[]> {
  if (cache) return cache;
  const loaded = Object.fromEntries(
    ARTICLE_LANGUAGES.map((language) => [language, readLanguage(language)]),
  ) as Record<ArticleLanguage, Article[]>;

  const slugs = ARTICLE_LANGUAGES.map((language) =>
    loaded[language].map((article) => article.slug).join(","),
  );
  if (new Set(slugs).size !== 1) {
    const [en, ru] = ARTICLE_LANGUAGES.map(
      (language) => new Set(loaded[language].map((article) => article.slug)),
    );
    const missing = [...en].filter((slug) => !ru.has(slug)).map((slug) => `ru/${slug}`);
    missing.push(...[...ru].filter((slug) => !en.has(slug)).map((slug) => `en/${slug}`));
    throw new Error(`articles without a language twin: ${missing.join(", ") || "order differs"}`);
  }

  cache = loaded;
  return loaded;
}

export const loadArticles = (language: ArticleLanguage): Article[] => loadAllArticles()[language];

export const findArticle = (language: ArticleLanguage, slug: string): Article | undefined =>
  loadArticles(language).find((article) => article.slug === slug);
