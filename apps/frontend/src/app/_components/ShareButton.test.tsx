import "@testing-library/jest-dom/jest-globals";

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Providers } from "@/app/providers";
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
