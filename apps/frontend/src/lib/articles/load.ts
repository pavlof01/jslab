import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { parseFrontMatter } from "./frontMatter";
import type { Article } from "./types";

const CONTENT_DIR = join(process.cwd(), "content", "articles", "en");

const FILE = /^(\d+)-([a-z0-9-]+)\.md$/;

function readArticle(dir: string, file: string): Article {
  const [, number, slug] = file.match(FILE) ?? [];
  const source = readFileSync(join(dir, file), "utf8");
  const { data, body } = parseFrontMatter(source);
  const text = (key: string) => {
    const value = data[key];
    if (typeof value !== "string" || !value) throw new Error(`${file}: no ${key}`);
    return value;
  };
  return {
    slug,
    number: Number(number),
    title: text("title"),
    description: text("description"),
    tags: Array.isArray(data.tags) ? data.tags : [],
    status: data.status === "published" ? "published" : "draft",
    body: body.replace(/^\s*# [^\n]*\n/, "").trimStart(),
  };
}

/** The series in `dir`, in file-number order; a missing directory is an empty series. */
export function readArticles(dir: string): Article[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => FILE.test(file))
    .map((file) => readArticle(dir, file))
    .sort((left, right) => left.number - right.number);
}

let cache: Article[] | null = null;

export function loadArticles(): Article[] {
  cache ??= readArticles(CONTENT_DIR);
  return cache;
}

export const findArticle = (slug: string): Article | undefined =>
  loadArticles().find((article) => article.slug === slug);
