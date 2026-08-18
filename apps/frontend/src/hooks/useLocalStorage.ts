import { useCallback, useSyncExternalStore } from "react";

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
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return initialValue;
  }

  const cached = parsed.get(key);
  if (cached && cached.raw === raw) return cached.value as T;

  let value = initialValue;
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = initialValue;
    }
  }
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
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch (error) {
        console.warn(`useLocalStorage could not write "${key}":`, error);
      }
      notifyAll();
    },
    [key, initialValue],
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`useLocalStorage could not remove "${key}":`, error);
    }
    notifyAll();
  }, [key]);

  return [value, setValue, removeValue];
}
