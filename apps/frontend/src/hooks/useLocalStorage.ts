import { useCallback, useSyncExternalStore } from "react";

import { parseJson, readRaw, removeKey, writeJson } from "@/lib/storage";

type SetValue<T> = (value: T | ((previous: T) => T)) => void;

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  if (listeners.size === 0) {
    window.addEventListener("storage", notifyAll);
  }
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) {
      window.removeEventListener("storage", notifyAll);
    }
  };
}

function notifyAll() {
  for (const listener of listeners) listener();
}

const parsed = new Map<string, { raw: string | null; value: unknown }>();

function readSnapshot<T>(key: string, initialValue: T): T {
  const raw = readRaw(window.localStorage, key);

  // useSyncExternalStore compares snapshots by identity, so re-parsing an
  // unchanged string would hand React a new object every render and loop.
  const cached = parsed.get(key);
  if (cached && cached.raw === raw) return cached.value as T;

  const value = parseJson(raw, initialValue);
  parsed.set(key, { raw, value });
  return value;
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>, () => void] {
  const getSnapshot = useCallback(() => readSnapshot(key, initialValue), [key, initialValue]);
  const getServerSnapshot = useCallback(() => initialValue, [initialValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue: SetValue<T> = useCallback(
    (next) => {
      const current = readSnapshot(key, initialValue);
      const resolved = next instanceof Function ? next(current) : next;
      if (!writeJson(window.localStorage, key, resolved)) {
        console.warn(`useLocalStorage could not write "${key}"`);
      }
      notifyAll();
    },
    [key, initialValue],
  );

  const removeValue = useCallback(() => {
    removeKey(window.localStorage, key);
    notifyAll();
  }, [key]);

  return [value, setValue, removeValue];
}
