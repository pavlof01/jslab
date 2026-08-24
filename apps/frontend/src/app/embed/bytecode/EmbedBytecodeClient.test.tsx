import { describe, expect, it } from "@jest/globals";
import "@testing-library/jest-dom/jest-globals";
import { render, screen, waitFor } from "@testing-library/react";

import { Providers } from "@/app/providers";
import type { EmbedSnapshot } from "@/lib/embedState";
import { EngineKey } from "@/lib/types";
import EmbedBytecodeClient from "./EmbedBytecodeClient";

const snapshot: EmbedSnapshot = {
  code: "1 + 1",
  engine: EngineKey.v8,
  flags: ["--print-bytecode"],
  output: "Ldar a0\nAdd a1\nReturn",
  title: "Adding two numbers",
};

const renderEmbed = (s: EmbedSnapshot | null) =>
  render(<EmbedBytecodeClient snapshot={s} />, { wrapper: Providers });

describe("EmbedBytecodeClient", () => {
  it("shows the engine, the caption and the dumped bytecode", async () => {
    renderEmbed(snapshot);
    expect(screen.getByText("V8")).toBeInTheDocument();
    expect(screen.getByText("Adding two numbers")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Ldar a0/)).toBeInTheDocument());
  });

  it("renders stderr under the dump when present", async () => {
    renderEmbed({ ...snapshot, stderr: "SyntaxError: unexpected token" });
    await waitFor(() =>
      expect(screen.getByText(/SyntaxError: unexpected token/)).toBeInTheDocument(),
    );
  });

  it("links back to the full playground with the snapshot restored", () => {
    renderEmbed(snapshot);
    const open = screen.getByRole("link", { name: /open this snippet in jslab/i });
    expect(open).toHaveAttribute("href", expect.stringContaining("/playground?s="));
  });

  it("shows a diagnosable error state when the snapshot could not be decoded", () => {
    renderEmbed(null);
    expect(screen.getByText(/no readable snapshot/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open jslab/i })).toHaveAttribute(
      "href",
      "/playground",
    );
  });
});
