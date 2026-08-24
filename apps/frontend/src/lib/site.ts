const DEFAULT_ORIGIN = "https://jslab.su";

function resolveOrigin(): string {
  const raw = (process.env.SITE_ORIGIN ?? DEFAULT_ORIGIN).trim().replace(/\/$/, "");
  try {
    new URL(raw);
  } catch {
    throw new Error(`SITE_ORIGIN is not a valid absolute URL: ${JSON.stringify(raw)}`);
  }
  return raw;
}

export const SITE_ORIGIN = resolveOrigin();

export const SITE_HOST = new URL(SITE_ORIGIN).host;

export function siteUrl(path: string): string {
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export const REPO_URL = "https://github.com/pavlof01/jslab";
