import { decodeText, encodeText } from "@/lib/base64url";
import { ENGINE_KEYS, EngineKey, isEngineKey } from "@/lib/types";

export interface ShareState {
  code: string;
  engines: EngineKey[];
  v8Flags: string[];
}

export const SHARE_PARAM = "s";

export function encodeShareState(state: ShareState): string {
  const compact = {
    c: state.code,
    e: state.engines,
    f: state.v8Flags,
  };
  return encodeText(JSON.stringify(compact));
}

export function decodeShareState(param: string): ShareState | null {
  try {
    const raw = JSON.parse(decodeText(param)) as { c?: unknown; e?: unknown; f?: unknown };
    if (typeof raw.c !== "string") return null;

    const engines = Array.isArray(raw.e) ? raw.e.filter(isEngineKey) : [];
    // V8 always renders in the playground, so guarantee it's present.
    const engineSet = new Set<EngineKey>(engines);
    engineSet.add(EngineKey.v8);

    const v8Flags = Array.isArray(raw.f) ? raw.f.filter((x): x is string => typeof x === "string") : [];

    return {
      code: raw.c,
      engines: ENGINE_KEYS.filter((k) => engineSet.has(k)),
      v8Flags,
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
