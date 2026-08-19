import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react";

import { useLocalStorage } from "./useLocalStorage";

/**
 * The hook backs the playground's persisted settings, so what matters is that
 * a write reaches storage, every mounted reader sees it, and a broken or
 * unavailable localStorage degrades to the initial value instead of throwing.
 */

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useLocalStorage", () => {
  it("starts from the initial value when nothing is stored", () => {
    const { result } = renderHook(() => useLocalStorage("key-a", "fallback"));
    expect(result.current[0]).toBe("fallback");
  });

  it("reads what is already stored", () => {
    window.localStorage.setItem("key-b", JSON.stringify({ count: 3 }));
    const { result } = renderHook(() => useLocalStorage("key-b", { count: 0 }));
    expect(result.current[0]).toEqual({ count: 3 });
  });

  it("writes JSON and re-renders with the new value", () => {
    const { result } = renderHook(() => useLocalStorage("key-c", 1));

    act(() => result.current[1](2));

    expect(result.current[0]).toBe(2);
    expect(window.localStorage.getItem("key-c")).toBe("2");
  });

  it("supports an updater function over the current stored value", () => {
    const { result } = renderHook(() => useLocalStorage("key-d", 10));

    act(() => result.current[1]((previous) => previous + 5));
    act(() => result.current[1]((previous) => previous + 5));

    expect(result.current[0]).toBe(20);
  });

  it("notifies every hook watching the same key", () => {
    const a = renderHook(() => useLocalStorage("shared", "one"));
    const b = renderHook(() => useLocalStorage("shared", "one"));

    act(() => a.result.current[1]("two"));

    expect(b.result.current[0]).toBe("two");
  });

  it("removes the key and falls back to the initial value", () => {
    const { result } = renderHook(() => useLocalStorage("key-e", "initial"));
    act(() => result.current[1]("stored"));

    act(() => result.current[2]());

    expect(window.localStorage.getItem("key-e")).toBeNull();
    expect(result.current[0]).toBe("initial");
  });

  it("falls back when the stored value is not valid JSON", () => {
    window.localStorage.setItem("key-f", "{not json");
    const { result } = renderHook(() => useLocalStorage("key-f", "safe"));
    expect(result.current[0]).toBe("safe");
  });

  it("falls back when reading storage throws (private mode, blocked cookies)", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied");
    });

    const { result } = renderHook(() => useLocalStorage("key-g", "safe"));
    expect(result.current[0]).toBe("safe");
  });

  it("warns instead of throwing when a write is rejected (quota exceeded)", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    const { result } = renderHook(() => useLocalStorage("key-h", "initial"));
    act(() => result.current[1]("too big"));

    expect(warn).toHaveBeenCalled();
    expect(result.current[0]).toBe("initial");
  });

  it("survives a removal the browser refuses", () => {
    jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("denied");
    });

    const { result } = renderHook(() => useLocalStorage("key-i", "initial"));

    expect(() => act(() => result.current[2]())).not.toThrow();
  });

  it("picks up a write made by another tab", () => {
    const { result } = renderHook(() => useLocalStorage("key-j", "initial"));

    act(() => {
      window.localStorage.setItem("key-j", JSON.stringify("from another tab"));
      window.dispatchEvent(new StorageEvent("storage", { key: "key-j" }));
    });

    expect(result.current[0]).toBe("from another tab");
  });

  it("keeps values for different keys apart", () => {
    const a = renderHook(() => useLocalStorage("key-k1", "a"));
    const b = renderHook(() => useLocalStorage("key-k2", "b"));

    act(() => a.result.current[1]("changed"));

    expect(a.result.current[0]).toBe("changed");
    expect(b.result.current[0]).toBe("b");
  });
});
