import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor, within } from "@testing-library/react";

import Providers from "@/app/providers";
import { buildBlocks } from "@/lib/articles/blocks";
import { findArticle, loadArticles } from "@/lib/articles/load";

import ArticleList from "./ArticleList";
import ArticleView from "./ArticleView";

jest.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: ({ value }: { value: string }) => (
    <textarea aria-label="Editor" value={value} readOnly />
  ),
}));

const renderArticle = async (language: "en" | "ru", slug: string) => {
  const article = findArticle(language, slug);
  if (!article) throw new Error(`no ${language}/${slug}`);
  const blocks = await buildBlocks(article.body);
  return render(<ArticleView article={article} blocks={blocks} />, { wrapper: Providers });
};

describe("ArticleView", () => {
  it("renders the table and the read-only checklist of the method article", async () => {
    await renderArticle("en", "how-to-investigate-javascript");
    expect(screen.getByRole("table")).toBeInTheDocument();
    const boxes = screen.getAllByRole("checkbox", { name: "Checklist item" });
    expect(boxes).toHaveLength(6);
    for (const box of boxes) {
      expect(box).not.toBeChecked();
      expect(box).toBeDisabled();
    }
    expect(screen.queryByText(/status: draft/)).not.toBeInTheDocument();
  });

  it("renders snapshots in place, without frames", async () => {
    const { container } = await renderArticle("en", "stack-accumulator-registers");
    expect(container.querySelector("iframe")).toBeNull();
    const figures = container.querySelectorAll("figure");
    expect(figures.length).toBe(5);
    const v8 = within(figures[0] as HTMLElement);
    expect(v8.getByText("V8")).toBeInTheDocument();
    expect(
      v8.getByText("14.9.0 · --print-bytecode --print-bytecode-filter=f · 2026-10-19"),
    ).toBeInTheDocument();
    await waitFor(() => expect(v8.getByText(/Ldar a1/)).toBeInTheDocument());
  });

  it("renders the exercise editor with the article's code", async () => {
    await renderArticle("en", "deoptimization");
    expect(screen.getByRole("region", { name: "Editor" })).toBeInTheDocument();
    expect(
      (screen.getByLabelText("Editor", { selector: "textarea" }) as HTMLTextAreaElement).value,
    ).toContain("%OptimizeFunctionOnNextCall(add);");
  });

  it("links to the other language and marks Russian text", async () => {
    const { container } = await renderArticle("ru", "one-program-many-engines");
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute(
      "href",
      "/articles/one-program-many-engines",
    );
    expect(container.querySelector("main")).toHaveAttribute("lang", "ru");
  });

  it("offers Русский on English pages", async () => {
    await renderArticle("en", "one-program-many-engines");
    expect(screen.getByRole("link", { name: "Русский" })).toHaveAttribute(
      "href",
      "/ru/articles/one-program-many-engines",
    );
  });
});

describe("ArticleList", () => {
  it("lists the series in order and links to the other language", () => {
    render(<ArticleList language="en" articles={loadArticles("en")} />, { wrapper: Providers });
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(31);
    const first = within(items[0]).getByRole("link");
    expect(first).toHaveTextContent(
      "Why I built JSLab: JavaScript is deeper than the way we explain it",
    );
    expect(first).toHaveAttribute("href", "/articles/why-jslab-exists");
    expect(screen.getByRole("link", { name: "Русский" })).toHaveAttribute("href", "/ru/articles");
  });

  it("links Russian entries under /ru/articles", () => {
    render(<ArticleList language="ru" articles={loadArticles("ru")} />, { wrapper: Providers });
    for (const item of screen.getAllByRole("listitem")) {
      expect(within(item).getByRole("link").getAttribute("href")).toMatch(/^\/ru\/articles\//);
    }
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("href", "/articles");
  });
});
