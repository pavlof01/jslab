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

export const SITE_NAME = "JSLab";

export const SITE_DESCRIPTION =
  "Dive deep into JavaScript engine internals. Visualize bytecode, optimization stages, and performance across V8, SpiderMonkey, JavaScriptCore, and Hermes.";

export const OG_CARD = {
  path: "/og",
  width: 1200,
  height: 630,
  maxTitle: 72,
  maxSubtitle: 168,
} as const;

export function ogCardText(raw: string, max: number): string {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) return collapsed;

  const clipped = collapsed.slice(0, max - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  const cut = lastSpace > max / 2 ? clipped.slice(0, lastSpace) : clipped;
  return `${cut.trimEnd()}…`;
}

type OgCardParams = {
  title?: string;
  subtitle?: string;
  engine?: string;
  lines?: number;
};

export function ogCardUrl(origin: string, params: OgCardParams = {}): string {
  const search = new URLSearchParams();
  const title = params.title ? ogCardText(params.title, OG_CARD.maxTitle) : "";
  const subtitle = params.subtitle ? ogCardText(params.subtitle, OG_CARD.maxSubtitle) : "";

  if (title !== "") search.set("title", title);
  if (subtitle !== "") search.set("subtitle", subtitle);
  if (params.engine) search.set("engine", params.engine);
  if (params.lines !== undefined && params.lines > 0) search.set("lines", String(params.lines));

  const query = search.toString();
  return `${origin}${OG_CARD.path}${query ? `?${query}` : ""}`;
}

export function siteUrl(path: string): string {
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export const REPO_URL = "https://github.com/pavlof01/jslab";
