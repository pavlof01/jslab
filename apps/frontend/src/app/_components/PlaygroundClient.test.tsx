import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import "@testing-library/jest-dom/jest-globals";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Providers } from "@/app/providers";
import { createEngineSelection, EngineKey, RunStatus } from "@/lib/types";
import { useEngineOutputsStore } from "@/store/useEngineOutputs";

import PlaygroundClient from "./PlaygroundClient";

jest.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: ({ value, onChange }: { value: string; onChange?: (v?: string) => void }) => (
    <textarea aria-label="Editor" value={value} onChange={(e) => onChange?.(e.target.value)} />
  ),
}));

const originalFetch = globalThis.fetch;
const originalClipboard = navigator.clipboard;

const renderPlayground = () => render(<PlaygroundClient />, { wrapper: Providers });

const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  json: async () => body,
});

beforeEach(() => {
  window.localStorage.clear();
  useEngineOutputsStore.getState().reset();
  useEngineOutputsStore.setState({ engines: createEngineSelection([EngineKey.v8]) });
});

afterEach(() => {
  (globalThis as unknown as { fetch: unknown }).fetch = originalFetch;
  Object.defineProperty(navigator, "clipboard", { value: originalClipboard, configurable: true });
  jest.restoreAllMocks();
});

describe("PlaygroundClient", () => {
  it("refuses an empty editor without spending a request", async () => {
    const fetchMock = jest.fn();
    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    renderPlayground();
    const user = userEvent.setup();

    act(() => useEngineOutputsStore.getState().setCode("   "));
    await user.click(screen.getByRole("button", { name: /^run$/i }));

    await waitFor(() =>
      expect(screen.getAllByText("Nothing to run — the editor is empty.")).toHaveLength(2),
    );
    expect(within(screen.getByRole("status")).getByText(/editor is empty/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a rate limit as a readable wait, not as engine output", async () => {
    (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(async () =>
      jsonResponse(429, { ok: false, error: "rate limit exceeded", meta: { retryAfter: 5 } }),
    );

    renderPlayground();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /^run$/i }));

    await waitFor(() =>
      expect(screen.getAllByText(/Try again in 5 seconds/).length).toBeGreaterThan(0),
    );
    expect(screen.getByText("⌘↵ to run")).toBeInTheDocument();
  });

  it("adds and removes an engine's tab with its chip, and never V8's", async () => {
    renderPlayground();
    const user = userEvent.setup();

    const tabs = () => screen.getAllByRole("tab").map((tab) => tab.textContent);

    expect(tabs()).toEqual(["V8"]);

    await user.click(screen.getByRole("checkbox", { name: /hermes/i }));
    await waitFor(() => expect(tabs()).toEqual(["V8", "Hermes"]));

    await user.click(screen.getByRole("checkbox", { name: /hermes/i }));
    await waitFor(() => expect(tabs()).toEqual(["V8"]));

    expect(screen.getByRole("checkbox", { name: /v8/i })).toBeDisabled();
  });

  it("records a successful run in history and a refused one not at all", async () => {
    const fetchMock = jest
      .fn()
      .mockImplementationOnce(async () =>
        jsonResponse(429, { ok: false, error: "rate limit exceeded" }),
      )
      .mockImplementationOnce(async () =>
        jsonResponse(200, { ok: true, stdout: "Ldar a1", stderr: "", meta: { durationMs: 12 } }),
      );
    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;

    renderPlayground();
    const user = userEvent.setup();
    const runButton = screen.getByRole("button", { name: /^run$/i });

    await user.click(runButton);
    await waitFor(() => expect(useEngineOutputsStore.getState().status).toBe(RunStatus.error));
    expect(window.localStorage.getItem("jslab:run-history")).toBeNull();

    await user.click(runButton);
    await waitFor(() => expect(useEngineOutputsStore.getState().status).toBe(RunStatus.done));
    await waitFor(() => expect(window.localStorage.getItem("jslab:run-history")).not.toBeNull());
  });
});
