import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor, within } from "@testing-library/react";

import Providers from "@/app/providers";
import { buildBlocks } from "@/lib/articles/blocks";
import type { Article } from "@/lib/articles/types";
import { buildSnapshotUrl, BYTECODE_EMBED_PATH } from "@/lib/embedState";
import { encodeShareState, SHARE_PARAM } from "@/lib/shareState";
import { EngineKey } from "@/lib/types";

import ArticleList from "./ArticleList";
import ArticleView from "./ArticleView";

jest.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: ({ value }: { value: string }) => (
    <textarea aria-label="Editor" value={value} readOnly />
  ),
}));

const ORIGIN = "https://jslab.su";

const article = (slug: string, body: string): Article => ({
  slug,
  number: 1,
  title: `Title of ${slug}`,
  description: `About ${slug}`,
  tags: [],
  status: "draft",
  body,
});

const renderArticle = async (slug: string, body: string) => {
  const blocks = await buildBlocks(body);
  return render(<ArticleView article={article(slug, body)} blocks={blocks} />, {
    wrapper: Providers,
  });
};

const METHOD = `| Engine | Flag |
| --- | --- |
| V8 | --print-bytecode |

- [ ] Read the spec
- [ ] Run the snippet
- [x] Compare the engines

status: draft is body text only when it is not front matter.
`;

describe("ArticleView", () => {
  it("renders tables and a read-only checklist", async () => {
    await renderArticle("method", METHOD);
    expect(screen.getByRole("table")).toBeInTheDocument();
    const boxes = screen.getAllByRole("checkbox", { name: "Checklist item" });
    expect(boxes).toHaveLength(3);
    for (const box of boxes) expect(box).toBeDisabled();
    expect(boxes.map((box) => (box as HTMLInputElement).checked)).toEqual([false, false, true]);
  });

  it("renders snapshots in place, without frames", async () => {
    const url = await buildSnapshotUrl(ORIGIN, {
      code: "function f(a, b) { return a + b; }\nf(1, 2);",
      engine: EngineKey.v8,
      flags: ["--print-bytecode", "--print-bytecode-filter=f"],
      output: "         0x0 @    0 : 0b 04             Ldar a1\n",
      title: "14.9.0 · --print-bytecode --print-bytecode-filter=f",
    });
    const { container } = await renderArticle("snapshot", `Before.\n\n${url}\n\nAfter.\n`);
    expect(container.querySelector("iframe")).toBeNull();
    const figures = container.querySelectorAll("figure");
    expect(figures.length).toBe(1);
    const v8 = within(figures[0] as HTMLElement);
    expect(v8.getByText("V8")).toBeInTheDocument();
    expect(v8.getByText("14.9.0 · --print-bytecode --print-bytecode-filter=f")).toBeInTheDocument();
    await waitFor(() => expect(v8.getByText(/Ldar a1/)).toBeInTheDocument());
  });

  it("renders the exercise editor with the article's code", async () => {
    const state = encodeShareState({
      code: "%OptimizeFunctionOnNextCall(add);",
      engines: [EngineKey.v8],
      flags: { [EngineKey.v8]: ["--allow-natives-syntax"] },
    });
    await renderArticle("exercise", `${ORIGIN}${BYTECODE_EMBED_PATH}?${SHARE_PARAM}=${state}\n`);
    expect(screen.getByRole("region", { name: "Editor" })).toBeInTheDocument();
    expect(
      ((await screen.findByLabelText("Editor", { selector: "textarea" })) as HTMLTextAreaElement)
        .value,
    ).toContain("%OptimizeFunctionOnNextCall(add);");
  });

  it("links back to the list", async () => {
    await renderArticle("back-link", "Text.\n");
    expect(screen.getByRole("link", { name: "Articles" })).toHaveAttribute("href", "/articles");
  });
});

describe("ArticleList", () => {
  it("lists the series in order", () => {
    const articles = [
      { ...article("first", ""), title: "First" },
      { ...article("second", ""), number: 2, title: "Second" },
    ];
    render(<ArticleList articles={articles} />, { wrapper: Providers });
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    const first = within(items[0]).getByRole("link");
    expect(first).toHaveTextContent("First");
    expect(first).toHaveAttribute("href", "/articles/first");
  });

  it("says the series is coming while it is empty", () => {
    render(<ArticleList articles={[]} />, { wrapper: Providers });
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByText("The first articles are on their way.")).toBeInTheDocument();
  });
});
