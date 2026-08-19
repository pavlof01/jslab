import { ENGINE_KEYS, type EngineKey, isEngineKey } from "@/lib/types";

export interface RunHistoryEntry {
  id: string;
  ts: number;
  code: string;
  engines: EngineKey[];
  v8Flags: string[];
}

export const RUN_HISTORY_KEY = "jslab:run-history";
export const MAX_HISTORY = 25;

function isEntry(x: unknown): x is RunHistoryEntry {
  if (!x || typeof x !== "object") return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.ts === "number" &&
    typeof e.code === "string" &&
    Array.isArray(e.engines) &&
    Array.isArray(e.v8Flags)
  );
}

export function loadHistory(storage: Storage = window.localStorage): RunHistoryEntry[] {
  try {
    const raw = storage.getItem(RUN_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry).map((e) => ({
      ...e,
      engines: e.engines.filter(isEngineKey),
      v8Flags: e.v8Flags.filter((f): f is string => typeof f === "string"),
    }));
  } catch {
    return [];
  }
}

export function pushHistory(
  entry: Omit<RunHistoryEntry, "id" | "ts">,
  makeId: () => string,
  now: number,
  storage: Storage = window.localStorage,
): RunHistoryEntry[] {
  const history = loadHistory(storage);
  const prev = history[0];
  const sameEngines = (a: EngineKey[], b: EngineKey[]) =>
    a.length === b.length && ENGINE_KEYS.every((k) => a.includes(k) === b.includes(k));
  const isDuplicate =
    prev &&
    prev.code === entry.code &&
    sameEngines(prev.engines, entry.engines) &&
    JSON.stringify(prev.v8Flags) === JSON.stringify(entry.v8Flags);

  if (isDuplicate) return history;

  const next = [{ ...entry, id: makeId(), ts: now }, ...history].slice(0, MAX_HISTORY);
  try {
    storage.setItem(RUN_HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Quota or disabled storage — history is best-effort.
  }
  return next;
}

export function clearHistory(storage: Storage = window.localStorage): void {
  try {
    storage.removeItem(RUN_HISTORY_KEY);
  } catch {
    // ignore
  }
}
