import { ENGINE_KEYS, EngineKey, isEngineKey } from "@/lib/types";

/**
 * Serializable playground state carried in a share URL. Kept intentionally
 * small (code + engine selection + v8 flags) so links stay copy-pasteable.
 */
export interface ShareState {
  code: string;
  engines: EngineKey[];
  v8Flags: string[];
}

/** Query-param name used for shared/embedded playground state. */
export const SHARE_PARAM = "s";

// Base64url so the payload is URL-safe without percent-encoding. We go through
// encodeURIComponent first so non-Latin1 source (unicode identifiers, emoji in
// strings) survives btoa, which only accepts Latin1.
function toBase64Url(json: string): string {
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(param: string): string {
  const b64 = param.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return decodeURIComponent(escape(atob(padded)));
}

export function encodeShareState(state: ShareState): string {
  const compact = {
    c: state.code,
    e: state.engines,
    f: state.v8Flags,
  };
  return toBase64Url(JSON.stringify(compact));
}

export function decodeShareState(param: string): ShareState | null {
  try {
    const raw = JSON.parse(fromBase64Url(param)) as { c?: unknown; e?: unknown; f?: unknown };
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

/** Build a share URL for the given origin+path (e.g. window.location). */
export function buildShareUrl(origin: string, path: string, state: ShareState): string {
  return `${origin}${path}?${SHARE_PARAM}=${encodeShareState(state)}`;
}

/** Path of the chrome-free playground built for iframes. */
export const EMBED_PATH = "/embed/playground";

/**
 * Ready-to-paste iframe snippet for the embeddable playground. The src is
 * absolute because the snippet is pasted on someone else's site.
 */
export function buildEmbedSnippet(origin: string, state: ShareState, height = 520): string {
  const src = buildShareUrl(origin, EMBED_PATH, state);
  return `<iframe src="${src}" width="100%" height="${height}" style="border:0;border-radius:8px" title="JSLab playground" loading="lazy"></iframe>`;
}
