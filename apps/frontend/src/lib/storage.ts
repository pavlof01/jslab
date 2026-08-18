/**
 * localStorage, told not to throw.
 *
 * Every stored feature — run history, custom samples, the useLocalStorage hook —
 * needs the same four things: read a key, parse it without trusting it, write
 * it back, and survive a browser that refuses all of the above (private mode,
 * disabled storage, quota). Each of them used to carry its own try/catch pair,
 * and they disagreed about what to do on failure.
 */

/** The raw string under `key`, or null when absent or unreadable. */
export function readRaw(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/** Parse stored JSON, falling back on anything that is not valid JSON. */
export function parseJson<T>(raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function readJson<T>(storage: Storage, key: string, fallback: T): T {
  return parseJson(readRaw(storage, key), fallback);
}

/** Write JSON. Returns false when storage refused it — callers treat that as best-effort. */
export function writeJson(storage: Storage, key: string, value: unknown): boolean {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Nothing to do: the value is already unreachable either way.
  }
}
