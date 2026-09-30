import "@testing-library/jest-dom/jest-globals";

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Providers from "@/app/providers";
import { compileAnnotations } from "@/lib/annotations";
import { decodeSnapshot, SNAPSHOT_PARAM } from "@/lib/embedState";
import { createEmptyOut } from "@/lib/runAggregate";
import { decodeShareState, SHARE_PARAM } from "@/lib/shareState";
import { createEngineSelection, EngineKey } from "@/lib/types";
import { useEngineOutputsStore } from "@/store/useEngineOutputs";

import ShareButton from "./ShareButton";

beforeEach(() => {
  useEngineOutputsStore.getState().reset();
  useEngineOutputsStore.setState({
    code: "const answer = 42;",
    engines: createEngineSelection([EngineKey.v8, EngineKey.jsc]),
    flags: { [EngineKey.v8]: ["--print-bytecode"] },
  });
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe("ShareButton", () => {
  it.each(["stdout", "stderr"] as const)(
    "copies the run source and flags for %s after the editor changes",
    async (channel) => {
      const user = userEvent.setup();
      const runCode = "/* @annotation\nmatch: ready\ntext: Original explanation.\n*/";
      const out = createEmptyOut();
      out[EngineKey.v8][channel] = "ready";
      useEngineOutputsStore.setState({
        code: runCode.replace("Original explanation.", "Unrun draft."),
        flags: { [EngineKey.v8]: ["--trace-opt"] },
        out,
        currentRun: {
          code: runCode,
          flags: { [EngineKey.v8]: ["--print-bytecode"] },
          engines: [EngineKey.v8],
          timestamp: 1,
        },
      });
      render(<ShareButton />, { wrapper: Providers });

      await user.click(screen.getByRole("button", { name: /share this snippet/i }));
      await user.click(await screen.findByText(/copy article link/i));
      expect(await screen.findByText(/article link copied/i)).toBeInTheDocument();

      const copied = new URL(await navigator.clipboard.readText());
      const snapshot = await decodeSnapshot(copied.searchParams.get(SNAPSHOT_PARAM)!);
      expect(snapshot).toEqual({
        code: runCode,
        engine: EngineKey.v8,
        flags: ["--print-bytecode"],
        output: out[EngineKey.v8].stdout,
        stderr: out[EngineKey.v8].stderr || undefined,
      });
      expect(
        compileAnnotations({
          source: snapshot!.code,
          output: channel === "stdout" ? snapshot!.output : snapshot!.stderr!,
        }).annotations[0].text,
      ).toBe("Original explanation.");
    },
  );

  it("disables article links when output has no run context", async () => {
    const user = userEvent.setup();
    const out = createEmptyOut();
    out[EngineKey.v8].stdout = "ready";
    useEngineOutputsStore.setState({ out });
    render(<ShareButton />, { wrapper: Providers });
    await user.click(screen.getByRole("button", { name: /share this snippet/i }));
    expect(await screen.findByRole("menuitem", { name: /copy article link/i })).toHaveAttribute(
      "data-disabled",
    );
  });

  it("copies a link that round-trips back to the current state", async () => {
    const user = userEvent.setup();
    render(<ShareButton />, { wrapper: Providers });

    await user.click(screen.getByRole("button", { name: /share this snippet/i }));
    await user.click(await screen.findByText(/copy link/i));

    const copied = await navigator.clipboard.readText();
    expect(copied).toContain(`?${SHARE_PARAM}=`);

    const param = new URL(copied).searchParams.get(SHARE_PARAM)!;
    const restored = decodeShareState(param)!;
    expect(restored.code).toBe("const answer = 42;");
    expect(restored.engines).toContain(EngineKey.v8);
    expect(restored.engines).toContain(EngineKey.jsc);
    expect(restored.flags[EngineKey.v8]).toEqual(["--print-bytecode"]);
  });

  it("confirms the copy in the trigger label", async () => {
    const user = userEvent.setup();
    render(<ShareButton />, { wrapper: Providers });

    await user.click(screen.getByRole("button", { name: /share this snippet/i }));
    await user.click(await screen.findByText(/copy link/i));

    expect(await screen.findByText(/link copied/i)).toBeInTheDocument();
  });
});
