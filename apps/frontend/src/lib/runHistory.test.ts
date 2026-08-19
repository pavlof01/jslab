import { describe, it, expect, beforeEach } from "@jest/globals";
import { loadHistory, pushHistory, clearHistory, MAX_HISTORY, RUN_HISTORY_KEY } from "./runHistory";
import { EngineKey } from "@/lib/types";

// jsdom provides localStorage; reset between tests.
beforeEach(() => window.localStorage.clear());

let counter = 0;
const makeId = () => `id-${counter++}`;
const entry = (code: string) => ({ code, engines: [EngineKey.v8], flags: {} });

describe("runHistory", () => {
  it("returns [] when empty", () => {
    expect(loadHistory()).toEqual([]);
  });

  it("prepends newest-first and assigns id/ts", () => {
    pushHistory(entry("a"), makeId, 1000);
    pushHistory(entry("b"), makeId, 2000);
    const h = loadHistory();
    expect(h.map((e) => e.code)).toEqual(["b", "a"]);
    expect(h[0].ts).toBe(2000);
    expect(typeof h[0].id).toBe("string");
  });

  it("skips a run identical to the most recent", () => {
    pushHistory(entry("x"), makeId, 1);
    const after = pushHistory(entry("x"), makeId, 2);
    expect(after).toHaveLength(1);
  });

  it("records again once something changed in between", () => {
    pushHistory(entry("x"), makeId, 1);
    pushHistory(entry("y"), makeId, 2);
    pushHistory(entry("x"), makeId, 3);
    expect(loadHistory().map((e) => e.code)).toEqual(["x", "y", "x"]);
  });

  it("caps at MAX_HISTORY", () => {
    for (let i = 0; i < MAX_HISTORY + 10; i++) pushHistory(entry(`code-${i}`), makeId, i);
    expect(loadHistory()).toHaveLength(MAX_HISTORY);
  });

  it("clear removes everything", () => {
    pushHistory(entry("a"), makeId, 1);
    clearHistory();
    expect(loadHistory()).toEqual([]);
  });

  it("keeps flags per engine and treats a flag change as a new run", () => {
    pushHistory({ code: "x", engines: [EngineKey.v8], flags: { [EngineKey.v8]: ["--print-bytecode"] } }, makeId, 1);
    pushHistory({ code: "x", engines: [EngineKey.v8], flags: { [EngineKey.v8]: ["--trace-opt"] } }, makeId, 2);

    const history = loadHistory();
    expect(history).toHaveLength(2);
    expect(history[0].flags).toEqual({ [EngineKey.v8]: ["--trace-opt"] });
  });

  it("replays history written when flags were a flat V8 list", () => {
    window.localStorage.setItem(
      RUN_HISTORY_KEY,
      JSON.stringify([{ id: "old", ts: 1, code: "x", engines: [EngineKey.v8], v8Flags: ["--print-bytecode"] }]),
    );
    expect(loadHistory()[0].flags).toEqual({ [EngineKey.v8]: ["--print-bytecode"] });
  });

  it("tolerates corrupt storage", () => {
    window.localStorage.setItem(RUN_HISTORY_KEY, "{not json");
    expect(loadHistory()).toEqual([]);
  });
});
