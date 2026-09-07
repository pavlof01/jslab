import { describe, expect, it } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TokensResult } from "shiki";

import Providers from "@/app/providers";
import { compileAnnotations } from "@/lib/annotations";
import { ENGINE_KEYS, EngineKey } from "@/lib/types";
import { compareOutputs } from "@/utils/diff-bytecode";

import { HighlightedCode } from "../CodeBlock";
import CodeDisplay from "./Code";

const source = `/* @annotation
match: status: ready
highlight: ready
title: Ready
text: The run can continue.
*/`;
const output = "header\nstatus: ready\nfooter";
const colors = {
  fg: "#C9CEC9",
  bg: "#0C0D0E",
  themeName: "ayu-dark",
  rootStyle: "",
  diff: { added: [], deleted: [], changes: [] },
};

const tokensFor = (text: string): TokensResult => {
  let offset = 0;
  return {
    ...colors,
    tokens: text.split("\n").map((content) => {
      const token = { content, offset, color: colors.fg };
      offset += content.length + 1;
      return [token];
    }),
  };
};

describe("output annotations", () => {
  it.each(ENGINE_KEYS)(
    "matches output from %s and reveals its explanation on click",
    async (engineKey) => {
      const user = userEvent.setup();
      render(<HighlightedCode engineKey={engineKey} source={source} out={output} />, {
        wrapper: Providers,
      });

      const trigger = await screen.findByRole("button", { name: "Explanation: Ready" });
      expect(trigger).toHaveTextContent(/^ready$/);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      await user.hover(trigger);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      await user.click(trigger);
      const popover = await screen.findByRole("dialog");
      expect(popover).toHaveTextContent("Ready");
      expect(popover).toHaveTextContent("The run can continue.");
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    },
  );

  it("opens on keyboard focus and dismisses on Escape and scroll", async () => {
    const user = userEvent.setup();
    const annotations = compileAnnotations({ source, output }).annotations;
    render(
      <div data-testid="scroll">
        <CodeDisplay
          {...tokensFor(output)}
          engineKey={EngineKey.hermes}
          annotations={annotations}
        />
      </div>,
      { wrapper: Providers },
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "Explanation: Ready" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("dialog")).toHaveTextContent("The run can continue.");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Explanation: Ready" }));
    expect(await screen.findByRole("dialog")).toBeVisible();
    fireEvent.scroll(screen.getByTestId("scroll"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps one trigger across syntax tokens and preserves the output and colors", () => {
    const annotations = compileAnnotations({ source, output: "status: ready" }).annotations;
    const tokens: TokensResult = {
      ...colors,
      tokens: [
        [
          { content: "status: re", offset: 0, color: "#ff0000" },
          { content: "ady", offset: 10, color: "#00ff00" },
        ],
      ],
    };
    render(<CodeDisplay {...tokens} engineKey={EngineKey.sm} annotations={annotations} />, {
      wrapper: Providers,
    });
    const trigger = screen.getByRole("button", { name: "Explanation: Ready" });
    expect(trigger).toHaveTextContent(/^ready$/);
    expect(trigger.parentElement?.textContent).toContain("status: ready");
    expect(screen.getByText("re")).toHaveStyle({ color: "#ff0000" });
    expect(screen.getByText("ady")).toHaveStyle({ color: "#00ff00" });
  });

  it("does not apply current annotations to deleted diff rows with colliding offsets", () => {
    const current = "status: ready";
    const diff = compareOutputs(tokensFor("status: error"), tokensFor(current), {
      normalizeLine: (line) => line,
    });
    const annotations = compileAnnotations({ source, output: current }).annotations;
    render(<CodeDisplay {...diff} engineKey={EngineKey.jsc} annotations={annotations} />, {
      wrapper: Providers,
    });
    expect(screen.getAllByRole("button", { name: "Explanation: Ready" })).toHaveLength(1);
    expect(screen.getByText("status: error")).toBeVisible();
  });

  it("keeps the opcode reference on the un-annotated remainder of a split token", async () => {
    const user = userEvent.setup();
    const annotations = compileAnnotations({
      source: "/* @annotation\nmatch: Return\nhighlight: Ret\ntext: Head.\n*/",
      output: "Return",
    }).annotations;
    render(
      <CodeDisplay {...tokensFor("Return")} engineKey={EngineKey.v8} annotations={annotations} />,
      { wrapper: Providers },
    );
    await user.click(screen.getByRole("button", { name: "Explanation: Ret" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Head.");
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "urn" }));
    const popover = await screen.findByRole("dialog");
    expect(popover).toHaveTextContent("Return accumulator from the current function.");
    expect(popover).toHaveTextContent("Return");
  });

  it("keeps opcode explanations available through the shared ClickPopover", async () => {
    const user = userEvent.setup();
    render(<CodeDisplay {...tokensFor("Return")} engineKey={EngineKey.v8} />, {
      wrapper: Providers,
    });
    await user.click(screen.getByRole("button", { name: "Return" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Return accumulator from the current function.",
    );
  });

  it("tells an empty output apart from output that is still tokenizing", async () => {
    const { rerender } = render(
      <HighlightedCode
        engineKey={EngineKey.v8}
        out="Return"
        fallback={<span>raw dump</span>}
        emptyState={<span>nothing to show</span>}
      />,
      { wrapper: Providers },
    );
    // Shiki resolves asynchronously, so the first paint carries the raw text.
    expect(screen.getByText("raw dump")).toBeVisible();
    expect(await screen.findByText("Return")).toBeVisible();
    expect(screen.queryByText("raw dump")).not.toBeInTheDocument();

    rerender(
      <HighlightedCode
        engineKey={EngineKey.v8}
        out=""
        fallback={<span>raw dump</span>}
        emptyState={<span>nothing to show</span>}
      />,
    );
    expect(screen.getByText("nothing to show")).toBeVisible();
    expect(screen.queryByText("raw dump")).not.toBeInTheDocument();
  });

  it("replaces annotations when the source/output changes and reports invalid directives", async () => {
    const { rerender } = render(
      <HighlightedCode engineKey={EngineKey.jsc} source={source} out={output} />,
      { wrapper: Providers },
    );
    expect(await screen.findByRole("button", { name: "Explanation: Ready" })).toBeVisible();
    rerender(<HighlightedCode engineKey={EngineKey.jsc} source="" out={output} />);
    expect(screen.queryByRole("button", { name: "Explanation: Ready" })).not.toBeInTheDocument();
    rerender(
      <HighlightedCode
        engineKey={EngineKey.jsc}
        source="/* @annotation\ntext: Missing match.\n*/"
        out={output}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("A non-empty `match` is required.");
  });
});
