import { decodeText, encodeText } from "@/lib/base64url";
import { ENGINE_KEYS, EngineKey, isEngineKey, type EngineFlags } from "@/lib/types";

export interface ShareState {
  code: string;
  engines: EngineKey[];
  flags: EngineFlags;
}

export const SHARE_PARAM = "s";

export function encodeShareState(state: ShareState): string {
  const compact = {
    c: state.code,
    e: state.engines,
    f: state.flags,
  };
  return encodeText(JSON.stringify(compact));
}

/** Keep only string flags, under keys that are engines we still know. */
function readFlags(raw: unknown): EngineFlags {
  // Links minted before flags were per-engine carry a bare array, which was
  // always V8's list. They still have to open.
  if (Array.isArray(raw)) {
    const legacy = raw.filter((flag): flag is string => typeof flag === "string");
    return legacy.length ? { [EngineKey.v8]: legacy } : {};
  }
  if (!raw || typeof raw !== "object") return {};

  const flags: EngineFlags = {};
  for (const [engine, list] of Object.entries(raw as Record<string, unknown>)) {
    if (!isEngineKey(engine) || !Array.isArray(list)) continue;
    const clean = list.filter((flag): flag is string => typeof flag === "string");
    if (clean.length) flags[engine] = clean;
  }
  return flags;
}

export function decodeShareState(param: string): ShareState | null {
  try {
    const raw = JSON.parse(decodeText(param)) as { c?: unknown; e?: unknown; f?: unknown };
    if (typeof raw.c !== "string") return null;

    const engines = Array.isArray(raw.e) ? raw.e.filter(isEngineKey) : [];
    // V8 always renders in the playground, so guarantee it's present.
    const engineSet = new Set<EngineKey>(engines);
    engineSet.add(EngineKey.v8);

    return {
      code: raw.c,
      engines: ENGINE_KEYS.filter((k) => engineSet.has(k)),
      flags: readFlags(raw.f),
    };
  } catch {
    return null;
  }
}

export function buildShareUrl(origin: string, path: string, state: ShareState): string {
  return `${origin}${path}?${SHARE_PARAM}=${encodeShareState(state)}`;
}

export const EMBED_PATH = "/embed/playground";

export function buildEmbedSnippet(origin: string, state: ShareState, height = 520): string {
  const src = buildShareUrl(origin, EMBED_PATH, state);
  return `<iframe src="${src}" width="100%" height="${height}" style="border:0;border-radius:8px" title="JSLab playground" loading="lazy"></iframe>`;
}
