import { type NextRequest, NextResponse } from "next/server";

import {
  BYTECODE_EMBED_PATH,
  BYTECODE_EMBED_TITLE,
  decodeSnapshot,
  EMBED_DEFAULT_HEIGHT,
  EMBED_DEFAULT_WIDTH,
  EMBED_THUMBNAIL,
  estimateEmbedHeight,
  SNAPSHOT_PARAM,
} from "@/lib/embedState";
import { clamp, finiteOr } from "@/lib/numbers";
import {
  decodeShareState,
  EMBED_PATH,
  PLAYGROUND_EMBED_TITLE,
  PLAYGROUND_PATH,
  SHARE_PARAM,
} from "@/lib/shareState";

/** Only our own embed paths may be turned into an iframe. */
const EMBEDDABLE_PATHS = [BYTECODE_EMBED_PATH, EMBED_PATH, PLAYGROUND_PATH];

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function clampDimension(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null || raw.trim() === "") return fallback;
  return clamp(Math.floor(finiteOr(raw, fallback)), min, max);
}

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format");
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

  const self = req.nextUrl;
  const host = req.headers.get("x-forwarded-host") ?? self.host;
  if (target.host !== host) return badRequest("url does not belong to this site", 404);

  const bareEditor = target.pathname === PLAYGROUND_PATH && !target.searchParams.has(SHARE_PARAM);
  if (bareEditor || !EMBEDDABLE_PATHS.includes(target.pathname)) {
    return badRequest("url is not an embeddable JSLab view", 404);
  }

  const snapshotParam =
    (target.pathname === BYTECODE_EMBED_PATH && target.searchParams.get(SNAPSHOT_PARAM)) || null;
  const shareParam = target.searchParams.get(SHARE_PARAM);
  const hasSnapshot = snapshotParam !== null;
  const needsState = !hasSnapshot && target.pathname !== EMBED_PATH;
  if (needsState && (!shareParam || !decodeShareState(shareParam))) {
    return badRequest(
      target.pathname === PLAYGROUND_PATH
        ? "playground link is missing readable state"
        : "bytecode embed is missing its snapshot or playground state",
      404,
    );
  }

  // Size the frame to the dump. Embedly fixes the height from this response and
  // the frame cannot renegotiate it afterwards, so a default here means every
  // short embed carries a band of empty space and every long one is cropped
  // harder than it needs to be.
  let naturalHeight = hasSnapshot ? EMBED_DEFAULT_HEIGHT : 520;
  if (hasSnapshot && snapshotParam) {
    const decoded = await decodeSnapshot(snapshotParam);
    if (decoded) naturalHeight = estimateEmbedHeight(decoded.output);
  }

  const width = clampDimension(
    req.nextUrl.searchParams.get("maxwidth"),
    EMBED_DEFAULT_WIDTH,
    240,
    1200,
  );
  const height = clampDimension(req.nextUrl.searchParams.get("maxheight"), naturalHeight, 160, 900);

  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  const protocol = local ? self.protocol : "https:";
  const origin = `${protocol}//${host}`;

  const frame = new URL(target.toString());
  frame.protocol = protocol;
  if (target.pathname === PLAYGROUND_PATH) frame.pathname = EMBED_PATH;
  frame.searchParams.set("referrer", "");
  const src = frame.toString();
  const title = hasSnapshot ? BYTECODE_EMBED_TITLE : PLAYGROUND_EMBED_TITLE;
  const html =
    `<iframe src="${src}" width="${width}" height="${height}" ` +
    `style="border:0;border-radius:8px;max-width:100%" title="${title}" ` +
    `loading="lazy" allow="clipboard-write"></iframe>`;

  return NextResponse.json(
    {
      version: "1.0",
      type: "rich",
      provider_name: "JSLab",
      provider_url: origin,
      title,
      thumbnail_url: `${origin}${EMBED_THUMBNAIL.path}`,
      thumbnail_width: EMBED_THUMBNAIL.width,
      thumbnail_height: EMBED_THUMBNAIL.height,
      width,
      height,
      html,
    },
    {
      headers: {
        // Consumers (Embedly among them) re-fetch on every article render; the
        // answer only depends on the URL, so let it be cached.
        "Cache-Control": "public, max-age=3600",
        Vary: "Host, X-Forwarded-Host",
        // oEmbed consumers are third-party by definition.
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
