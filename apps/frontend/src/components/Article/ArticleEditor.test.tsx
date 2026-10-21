import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import Providers from "@/app/providers";
import { createEngineSelection, EngineKey } from "@/lib/types";
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

beforeEach(() => {
  useEngineOutputsStore.getState().reset();
  useEngineOutputsStore.setState({ code: "playground code" });
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
});
