import "@testing-library/jest-dom/jest-globals";

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import Providers from "@/app/providers";
import { createEngineSelection, EngineKey, RunStatus } from "@/lib/types";
import { useEngineOutputsStore } from "@/store/useEngineOutputs";

import ArticleEditor from "./ArticleEditor";

jest.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: ({ value }: { value: string }) => (
    <textarea aria-label="Editor" value={value} readOnly />
  ),
}));

const state = {
  code: "print(1 + 1);",
  engines: [EngineKey.v8, EngineKey.jsc],
  flags: { [EngineKey.v8]: ["--allow-natives-syntax"] },
};

const originalFetch = globalThis.fetch;

beforeEach(() => {
  useEngineOutputsStore.getState().reset();
  useEngineOutputsStore.setState({ code: "playground code" });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("ArticleEditor", () => {
  it("starts with the article's code, engines and flags", () => {
    render(<ArticleEditor state={state} />, { wrapper: Providers });
    const store = useEngineOutputsStore.getState();
    expect(store.code).toBe("print(1 + 1);");
    expect(store.engines).toEqual(createEngineSelection([EngineKey.v8, EngineKey.jsc]));
    expect(store.flags).toEqual({ [EngineKey.v8]: ["--allow-natives-syntax"] });
    expect(screen.getByRole("button", { name: /Run/ })).toBeInTheDocument();
  });

  it("gives the playground its state back on unmount", () => {
    const before = useEngineOutputsStore.getState();
    const { unmount } = render(<ArticleEditor state={state} />, { wrapper: Providers });
    unmount();
    const after = useEngineOutputsStore.getState();
    expect(after.code).toBe("playground code");
    expect(after.engines).toEqual(before.engines);
    expect(after.flags).toEqual(before.flags);
  });

  it("cuts off a playground run that is still in flight", async () => {
    let answer: (value: unknown) => void = () => {};
    (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(
      () => new Promise((resolve) => (answer = resolve)),
    );
    const pending = useEngineOutputsStore.getState().runEngines({ engines: [EngineKey.v8] });
    expect(useEngineOutputsStore.getState().status).toBe(RunStatus.running);

    const { unmount } = render(<ArticleEditor state={state} />, { wrapper: Providers });
    answer({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ ok: true, stdout: "from the playground", stderr: "", artifacts: [] }),
    });
    expect(await pending).toBe("superseded");
    expect(useEngineOutputsStore.getState().out[EngineKey.v8].stdout).not.toBe(
      "from the playground",
    );

    unmount();
    const after = useEngineOutputsStore.getState();
    expect(after.code).toBe("playground code");
    expect(after.status).toBe(RunStatus.idle);
  });
});
