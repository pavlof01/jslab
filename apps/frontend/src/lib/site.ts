/**
 * The site's own public origin, in one place.
 *
 * It was previously spelled out as a literal in thirteen spots — sitemap,
 * robots, canonical metadata, the footer, the oEmbed discovery fallback — so a
 * domain change meant finding all of them, and the app already serves two hosts
 * (jslab.su and jslab.cc, see infra/k8s/base/ingress.yaml).
 *
 * Read from the environment rather than baked in, matching how the backend URLs
 * next door already work (`JSLAB_BACKEND_URL`, `TRACE_SERVICE_URL`).
 *
 * Deliberately NOT `NEXT_PUBLIC_`: every consumer is a server component, and a
 * NEXT_PUBLIC value is inlined at build time, which would mean rebuilding the
 * image to change a domain. If a client component ever needs this, prefer
 * `window.location.origin` — it is already what the share buttons use, and it
 * stays correct on whichever host the visitor actually arrived at.
 */

const DEFAULT_ORIGIN = "https://jslab.su";

function resolveOrigin(): string {
  const raw = (process.env.SITE_ORIGIN ?? DEFAULT_ORIGIN).trim().replace(/\/$/, "");
  try {
    // Fail loudly at startup rather than emitting a broken canonical URL or a
    // sitemap full of malformed links that nothing would flag.
    new URL(raw);
  } catch {
    throw new Error(`SITE_ORIGIN is not a valid absolute URL: ${JSON.stringify(raw)}`);
  }
  return raw;
}

/** e.g. "https://jslab.su" — no trailing slash. */
export const SITE_ORIGIN = resolveOrigin();

/** e.g. "jslab.su" — host only, for Host-header fallbacks. */
export const SITE_HOST = new URL(SITE_ORIGIN).host;

/** Absolute URL for a site-relative path. */
export function siteUrl(path: string): string {
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}
