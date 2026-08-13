import { NextRequest, NextResponse } from "next/server";

import {
  BYTECODE_EMBED_PATH,
  EMBED_DEFAULT_WIDTH,
  EMBED_DEFAULT_HEIGHT,
  SNAPSHOT_PARAM,
  decodeSnapshot,
  estimateEmbedHeight,
} from "@/lib/embedState";
import { EMBED_PATH } from "@/lib/shareState";

/**
 * oEmbed provider endpoint (https://oembed.com).
 *
 * This is what makes a bare URL pasted into Medium render as a block instead of
 * a link card: Medium delegates to Embedly, Embedly finds the
 * <link rel="alternate" type="application/json+oembed"> on the embed page and
 * calls this.
 *
 * Note the returned `height` is final. Embedly wraps our iframe in its own, so
 * nothing the frame posts afterwards can resize it — the embed scrolls
 * internally instead.
 */

/** Only our own embed paths may be turned into an iframe. */
const EMBEDDABLE_PATHS = [BYTECODE_EMBED_PATH, EMBED_PATH];

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function clampDimension(raw: string | null, fallback: number, min: number, max: number): number {
  // The null check is load-bearing: Number(null) is 0, not NaN, so a missing
  // maxwidth/maxheight would sail past a Number.isFinite guard and clamp to the
  // minimum instead of using the default.
  if (raw === null || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format");
  // The spec says a provider that cannot supply the requested format must answer
  // 501, not silently hand back JSON.
  if (format && format !== "json") {
    return badRequest(`format "${format}" is not supported`, 501);
  }

  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) return badRequest("url parameter is required");

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return badRequest("url is not a valid absolute URL");
  }

  // Same-origin only. Without this the endpoint would happily frame any site on
  // the internet under our name, and a consumer that trusts our provider domain
  // would render it.
  const self = req.nextUrl;
  const sameHost = target.host === (req.headers.get("x-forwarded-host") ?? self.host);
  if (!sameHost) return badRequest("url does not belong to this site", 404);

  if (!EMBEDDABLE_PATHS.includes(target.pathname)) {
    return badRequest("url is not an embeddable JSLab view", 404);
  }

  const isBytecode = target.pathname === BYTECODE_EMBED_PATH;
  const snapshotParam = target.searchParams.get(SNAPSHOT_PARAM);
  // A bytecode embed without a payload renders an error state; refusing here
  // gives the author a diagnosable failure at paste time instead.
  if (isBytecode && !snapshotParam) {
    return badRequest("bytecode embed is missing its snapshot", 404);
  }

  // Size the frame to the dump. Embedly fixes the height from this response and
  // the frame cannot renegotiate it afterwards, so a default here means every
  // short embed carries a band of empty space and every long one is cropped
  // harder than it needs to be.
  let naturalHeight = isBytecode ? EMBED_DEFAULT_HEIGHT : 520;
  if (isBytecode && snapshotParam) {
    const decoded = await decodeSnapshot(snapshotParam);
    if (decoded) naturalHeight = estimateEmbedHeight(decoded.output);
  }

  const width = clampDimension(req.nextUrl.searchParams.get("maxwidth"), EMBED_DEFAULT_WIDTH, 240, 1200);
  const height = clampDimension(req.nextUrl.searchParams.get("maxheight"), naturalHeight, 160, 900);

  const src = target.toString();
  const title = isBytecode ? "JSLab bytecode" : "JSLab playground";
  const html =
    `<iframe src="${src}" width="${width}" height="${height}" ` +
    `style="border:0;border-radius:8px;max-width:100%" title="${title}" ` +
    `loading="lazy" allow="clipboard-write"></iframe>`;

  return NextResponse.json(
    {
      version: "1.0",
      type: "rich",
      provider_name: "JSLab",
      provider_url: `${self.protocol}//${req.headers.get("x-forwarded-host") ?? self.host}`,
      title,
      width,
      height,
      html,
    },
    {
      headers: {
        // Consumers (Embedly among them) re-fetch on every article render; the
        // answer only depends on the URL, so let it be cached.
        "Cache-Control": "public, max-age=3600",
        // oEmbed consumers are third-party by definition.
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
