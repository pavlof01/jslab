import { ENGINE_KEYS, EngineKey, isEngineKey, type EngineFlags } from "@/lib/types";

export interface RunHistoryEntry {
  id: string;
  ts: number;
  code: string;
  engines: EngineKey[];
  flags: EngineFlags;
}

export const RUN_HISTORY_KEY = "jslab:run-history";
export const MAX_HISTORY = 25;

/** A stored entry, either shape: `flags` per engine, or the older flat `v8Flags`. */
type StoredEntry = Omit<RunHistoryEntry, "flags"> & { flags?: unknown; v8Flags?: unknown };

function isEntry(x: unknown): x is StoredEntry {
  if (!x || typeof x !== "object") return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.ts === "number" &&
    typeof e.code === "string" &&
    Array.isArray(e.engines) &&
    (typeof e.flags === "object" || Array.isArray(e.v8Flags))
  );
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

/** Normalize either stored shape into the per-engine map. */
function readFlags(entry: StoredEntry): EngineFlags {
  // History written before flags were per-engine kept a single V8 list; those
  // entries stay replayable rather than losing their flags on read.
  if (entry.flags === undefined || entry.flags === null) {
    const legacy = strings(entry.v8Flags);
    return legacy.length ? { [EngineKey.v8]: legacy } : {};
  }

  const flags: EngineFlags = {};
  for (const [engine, list] of Object.entries(entry.flags as Record<string, unknown>)) {
    if (!isEngineKey(engine)) continue;
    const clean = strings(list);
    if (clean.length) flags[engine] = clean;
  }
  return flags;
}

export function loadHistory(storage: Storage = window.localStorage): RunHistoryEntry[] {
  try {
    const raw = storage.getItem(RUN_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry).map((entry) => ({
      id: entry.id,
      ts: entry.ts,
      code: entry.code,
      engines: entry.engines.filter(isEngineKey),
      flags: readFlags(entry),
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
  const sameFlags = (a: EngineFlags, b: EngineFlags) =>
    ENGINE_KEYS.every((k) => JSON.stringify(a[k] ?? []) === JSON.stringify(b[k] ?? []));
  const isDuplicate =
    prev && prev.code === entry.code && sameEngines(prev.engines, entry.engines) && sameFlags(prev.flags, entry.flags);

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
